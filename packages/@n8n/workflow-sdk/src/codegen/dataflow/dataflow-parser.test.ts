import { parseDataFlowCode, parseDataFlowCodeToGraph } from './dataflow-parser';
import { semanticGraphToWorkflowJSON } from '../semantic-graph';

describe('parseDataFlowCode', () => {
	describe('executeNode() parsing', () => {
		it('should parse executeNode() inside .map() as a per-item node', () => {
			const code = `workflow({ name: 'Simple' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.httpRequest',
        params: { url: 'https://example.com' },
        version: 4,
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(2);
			expect(result.nodes[0].type).toBe('n8n-nodes-base.manualTrigger');
			expect(result.nodes[1].type).toBe('n8n-nodes-base.httpRequest');
			// Per-item nodes should NOT have executeOnce
			expect(result.nodes[1].executeOnce).toBeUndefined();

			// Trigger → HTTP Request
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns![0]).toEqual([{ node: 'HTTP Request', type: 'main', index: 0 }]);
		});

		it('should parse chained .map() executeNode() calls', () => {
			const code = `workflow({ name: 'Chain' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.httpRequest',
        params: { url: 'https://example.com' },
        version: 4,
      }),
    );
    const set = hTTP_Request.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.set',
        params: {},
        version: 3,
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(3);
			expect(result.nodes[0].type).toBe('n8n-nodes-base.manualTrigger');
			expect(result.nodes[1].type).toBe('n8n-nodes-base.httpRequest');
			expect(result.nodes[2].type).toBe('n8n-nodes-base.set');

			// Trigger → HTTP Request
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns![0]).toEqual([{ node: 'HTTP Request', type: 'main', index: 0 }]);

			// HTTP Request → Set
			const httpConns = result.connections['HTTP Request']?.main;
			expect(httpConns![0]).toEqual([{ node: 'Set', type: 'main', index: 0 }]);
		});

		it('should parse sequential executeNode() calls as execute-once chain', () => {
			const code = `workflow({ name: 'Chain' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com/config' },
      version: 4,
    });
    const set = executeNode({
      type: 'n8n-nodes-base.set',
      params: {},
      version: 3,
    });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(3);
			expect(result.nodes[1].type).toBe('n8n-nodes-base.httpRequest');
			expect(result.nodes[2].type).toBe('n8n-nodes-base.set');
			// Direct executeNode() calls should have executeOnce = true
			expect(result.nodes[1].executeOnce).toBe(true);
			expect(result.nodes[2].executeOnce).toBe(true);

			// Trigger → HTTP Request
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns![0]).toEqual([{ node: 'HTTP Request', type: 'main', index: 0 }]);

			// HTTP Request → Set (implicit chaining)
			const httpConns = result.connections['HTTP Request']?.main;
			expect(httpConns![0]).toEqual([{ node: 'Set', type: 'main', index: 0 }]);
		});
	});

	describe('variable reference parsing in params', () => {
		it('should convert prevVar.json.field to n8n expression in execute-once mode', () => {
			const code = `workflow({ name: 'Expr' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const fetch_Data = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com/users' },
      version: 4,
    });
    const transform = executeNode({
      type: 'n8n-nodes-base.set',
      params: { value: fetch_Data.json.name },
      version: 3,
    });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(3);
			// The param value should be converted to n8n expression
			expect(result.nodes[2]!.parameters!.value).toBe('={{ $json.name }}');
		});

		it('should convert item.json.field to n8n expression inside .map()', () => {
			const code = `workflow({ name: 'MapExpr' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const fetch_Users = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com/users' },
      version: 4,
    });
    fetch_Users.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.emailSend',
        params: { toEmail: item.json.email, subject: 'Welcome' },
        version: 2,
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(3);
			expect(result.nodes[2]!.parameters!.toEmail).toBe('={{ $json.email }}');
			expect(result.nodes[2]!.parameters!.subject).toBe('Welcome');
		});
	});

	describe('non-predecessor variable references', () => {
		it('should emit $("NodeName").item.json.field when var references a non-predecessor node', () => {
			const code = `workflow({ name: 'NonPred' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const edit_Fields = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Edit Fields',
        params: { options: {} },
        version: 3,
      }),
    );
    const notify = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.telegram',
        name: 'Notify',
        params: { chatId: edit_Fields.json.telegramChatID },
        version: 1,
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			// 'edit_Fields' is NOT the direct predecessor of 'Notify' (trigger is),
			// so it should produce $('Edit Fields').item.json.telegramChatID
			const notifyNode = result.nodes.find((n) => n.name === 'Notify');
			expect(notifyNode!.parameters!.chatId).toBe(
				"={{ $('Edit Fields').item.json.telegramChatID }}",
			);
		});

		it('should emit $json.field when var references the direct predecessor', () => {
			const code = `workflow({ name: 'Pred' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const fetch_Data = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.httpRequest',
        params: { url: 'https://example.com' },
        version: 4,
      }),
    );
    const transform = fetch_Data.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.set',
        params: { value: item.json.name },
        version: 3,
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			// 'item' inside .map() on fetch_Data IS the predecessor, so it stays as $json
			const transformNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect(transformNode!.parameters!.value).toBe('={{ $json.name }}');
		});

		it('should emit $("NodeName") in template literals for non-predecessor refs', () => {
			const code = `workflow({ name: 'Template' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const copy_file = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.httpRequest',
        name: 'Copy file',
        params: { url: 'https://example.com' },
        version: 4,
      }),
    );
    const other = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.httpRequest',
        name: 'Other',
        params: {},
        version: 4,
      }),
    );
    const use_file = other.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.httpRequest',
        name: 'Use file',
        params: { url: \`https://example.com/\${copy_file.json.id}/edit\` },
        version: 4,
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			const useFileNode = result.nodes.find((n) => n.name === 'Use file');
			expect(useFileNode!.parameters!.url).toBe(
				"=https://example.com/{{ $('Copy file').item.json.id }}/edit",
			);
		});
	});

	describe('subnode builder parsing', () => {
		it('should parse languageModel() builder to ai_languageModel subnode', () => {
			const code = `workflow({ name: 'AI' }, () => {
  onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {}, version: 1 }, (items) => {
    const agent = executeNode({
      type: '@n8n/n8n-nodes-langchain.agent',
      params: { agent: 'conversationalAgent' },
      version: 1,
      subnodes: {
        model: languageModel({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          params: { model: 'gpt-4' },
          version: 1,
        }),
      },
    });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(3);
			const agentNode = result.nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.agent')!;
			const modelNode = result.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			)!;
			expect(agentNode).toBeDefined();
			expect(modelNode).toBeDefined();

			// AI model should connect to agent via ai_languageModel
			const modelConns = result.connections[modelNode.name!]?.ai_languageModel;
			expect(modelConns).toBeDefined();
			expect(modelConns![0]).toEqual([
				{ node: agentNode.name, type: 'ai_languageModel', index: 0 },
			]);

			// AI-only subnode should NOT have a spurious 'main' key in connections
			expect(result.connections[modelNode.name!]?.main).toBeUndefined();
		});

		it('should position subnodes below their parent node', () => {
			const code = `workflow({ name: 'AI' }, () => {
  onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {}, version: 1 }, (items) => {
    const agent = executeNode({
      type: '@n8n/n8n-nodes-langchain.agent',
      params: { agent: 'conversationalAgent' },
      version: 1,
      subnodes: {
        model: languageModel({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          params: { model: 'gpt-4' },
          version: 1,
        }),
      },
    });
  });
});`;

			const result = parseDataFlowCode(code);

			const agentNode = result.nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.agent')!;
			const modelNode = result.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			)!;

			// Subnode Y position should be greater than parent (below it on canvas)
			expect(modelNode.position[1]).toBeGreaterThan(agentNode.position[1]);
		});

		it('should parse tools array with tool() builders', () => {
			const code = `workflow({ name: 'AI Tools' }, () => {
  onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {}, version: 1 }, (items) => {
    const agent = executeNode({
      type: '@n8n/n8n-nodes-langchain.agent',
      params: {},
      version: 1,
      subnodes: {
        model: languageModel({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          params: { model: 'gpt-4' },
          version: 1,
        }),
        tools: [
          tool({
            type: '@n8n/n8n-nodes-langchain.toolCode',
            params: { code: 'return []' },
            version: 1,
          }),
          tool({
            type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
            params: {},
            version: 1,
          }),
        ],
      },
    });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(5); // trigger + agent + model + 2 tools
			const toolTypes = result.nodes.filter((n) => n.type.includes('tool')).map((n) => n.type);
			expect(toolTypes).toContain('@n8n/n8n-nodes-langchain.toolCode');
			expect(toolTypes).toContain('@n8n/n8n-nodes-langchain.toolHttpRequest');

			// Both tools should connect to agent via ai_tool
			const toolCodeNode = result.nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.toolCode');
			const toolConns = result.connections[toolCodeNode!.name!]?.ai_tool;
			expect(toolConns).toBeDefined();
		});
	});

	describe('imperative if/else rejection', () => {
		it('should throw on if/else with hint to use .branch()', () => {
			const code = `workflow({ name: 'IF Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    if (items[0].json.status === 'active') {
      const true_Branch = executeNode({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 });
    } else {
      const false_Branch = executeNode({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {}, version: 3 });
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.branch\(\)/);
		});

		it('should throw on else-if with hint to use .branch()', () => {
			const code = `workflow({ name: 'Else If' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    if (items[0].json.score > 90) {
      const grade_A = executeNode({ type: 'n8n-nodes-base.set', name: 'Grade A', params: {}, version: 3 });
    } else if (items[0].json.score > 70) {
      const grade_B = executeNode({ type: 'n8n-nodes-base.set', name: 'Grade B', params: {}, version: 3 });
    } else {
      const grade_F = executeNode({ type: 'n8n-nodes-base.set', name: 'Grade F', params: {}, version: 3 });
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.branch\(\)/);
		});
	});

	describe('imperative switch rejection', () => {
		it('should throw on switch/case with hint to use .route()', () => {
			const code = `workflow({ name: 'Switch Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    switch (items[0].json.status) {
      case 'active': {
        const active_Handler = executeNode({ type: 'n8n-nodes-base.set', name: 'Active Handler', params: {}, version: 3 });
        break;
      }
      case 'inactive': {
        const inactive_Handler = executeNode({ type: 'n8n-nodes-base.set', name: 'Inactive Handler', params: {}, version: 3 });
        break;
      }
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.route\(\)/);
		});
	});

	describe('batch() parsing', () => {
		it('should parse batch() as SplitInBatches with loop-back connection', () => {
			const code = `workflow({ name: 'For Of Loop' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const data = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com/items' },
      version: 4,
    });
    batch(data, (item) => {
      const process_Item = executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Process Item',
        params: {},
        version: 3,
      });
    });
  });
});`;

			const result = parseDataFlowCode(code);

			// Should have: Trigger, HTTP Request, SplitInBatches, Process Item
			expect(result.nodes).toHaveLength(4);
			const sibNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
			expect(sibNode).toBeDefined();
			expect(sibNode!.name).toBe('Split In Batches');

			// HTTP Request → SplitInBatches
			expect(result.connections['HTTP Request']?.main![0]).toEqual(
				expect.arrayContaining([expect.objectContaining({ node: 'Split In Batches' })]),
			);

			// SplitInBatches output 1 (loop) → Process Item
			const sibConns = result.connections['Split In Batches']?.main;
			expect(sibConns).toBeDefined();
			expect(sibConns![1]).toEqual([{ node: 'Process Item', type: 'main', index: 0 }]);

			// Process Item → SplitInBatches (loop-back)
			expect(result.connections['Process Item']?.main![0]).toEqual([
				{ node: 'Split In Batches', type: 'main', index: 0 },
			]);
		});

		it('should connect nodes after batch() to SplitInBatches done output', () => {
			const code = `workflow({ name: 'For Then Continue' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const data = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com' },
      version: 4,
    });
    batch(data, (item) => {
      const process = executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Process',
        params: {},
        version: 3,
      });
    });
    const summary = executeNode({
      type: 'n8n-nodes-base.set',
      name: 'Summary',
      params: {},
      version: 3,
    });
  });
});`;

			const result = parseDataFlowCode(code);

			// Should have: Trigger, HTTP Request, SplitInBatches, Process, Summary
			expect(result.nodes).toHaveLength(5);

			// SplitInBatches done output (0) → Summary
			const sibConns = result.connections['Split In Batches']?.main;
			expect(sibConns![0]).toEqual([{ node: 'Summary', type: 'main', index: 0 }]);
		});

		it('should parse batch() with config object', () => {
			const code = `workflow({ name: 'Batch Config' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const data = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com/items' },
      version: 4,
    });
    batch(data, { params: { batchSize: 10 }, version: 3, name: 'Process Each' }, (item) => {
      const step = executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Step',
        params: {},
        version: 3,
      });
    });
  });
});`;

			const result = parseDataFlowCode(code);

			const sibNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
			expect(sibNode).toBeDefined();
			expect(sibNode!.name).toBe('Process Each');
			expect(sibNode!.parameters).toEqual({ batchSize: 10 });
			expect(sibNode!.typeVersion).toBe(3);
		});

		it('should throw error for imperative for...of loop', () => {
			const code = `workflow({ name: 'Bad' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    for (const item of items) {
      const step = executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 });
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.map\(\)/);
		});

		it('should throw error for while loop', () => {
			const code = `workflow({ name: 'Bad' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    while (true) {
      const step = executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 });
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.map\(\)/);
		});

		it('should throw error for do...while loop', () => {
			const code = `workflow({ name: 'Bad' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    do {
      const step = executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 });
    } while (true);
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.map\(\)/);
		});
	});

	describe('executeOnce semantics', () => {
		it('should not set executeOnce on nodes inside .branch() true branch', () => {
			const code = `workflow({ name: 'Branch' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    items.branch(
      (item) => item.json.status === 'active',
      (items) => {
        const handler = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Handler', params: {}, version: 3 }));
      },
    );
  });
});`;

			const result = parseDataFlowCode(code);

			const handler = result.nodes.find((n) => n.name === 'Handler');
			expect(handler).toBeDefined();
			expect(handler!.executeOnce).toBeUndefined();
		});

		it('should not set executeOnce on nodes inside .branch() false branch', () => {
			const code = `workflow({ name: 'Else' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    items.branch(
      (item) => item.json.ok === true,
      (items) => {
        const a = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'A', params: {}, version: 3 }));
      },
      (items) => {
        const b = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'B', params: {}, version: 3 }));
      },
    );
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes.find((n) => n.name === 'A')!.executeOnce).toBeUndefined();
			expect(result.nodes.find((n) => n.name === 'B')!.executeOnce).toBeUndefined();
		});

		it('should not set executeOnce on nodes inside .route() cases', () => {
			const code = `workflow({ name: 'Switch' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    items.route((item) => item.json.type, {
      a: (items) => {
        const handler_A = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Handler A', params: {}, version: 3 }));
      },
      default: (items) => {
        const fallback = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Fallback', params: {}, version: 3 }));
      },
    });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes.find((n) => n.name === 'Handler A')!.executeOnce).toBeUndefined();
			expect(result.nodes.find((n) => n.name === 'Fallback')!.executeOnce).toBeUndefined();
		});

		it('should not set executeOnce on nodes inside .handleError() callback', () => {
			const code = `workflow({ name: 'HandleError' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const risky = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 })
      .handleError((items) => {
        const fallback = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Fallback', params: {}, version: 3 }));
      });
  });
});`;

			const result = parseDataFlowCode(code);

			// Main node gets executeOnce (direct executeNode at top level)
			expect(result.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!.executeOnce).toBe(
				true,
			);
			// Error handler node does NOT get executeOnce
			expect(result.nodes.find((n) => n.name === 'Fallback')!.executeOnce).toBeUndefined();
		});

		it('should set executeOnce on nodes before a branch but not inside', () => {
			const code = `workflow({ name: 'Mixed' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const fetch = executeNode({ type: 'n8n-nodes-base.httpRequest', name: 'Fetch', params: { url: 'https://example.com' }, version: 4 });
    items.branch(
      (item) => item.json.ok === true,
      (items) => {
        const handler = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Handler', params: {}, version: 3 }));
      },
    );
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes.find((n) => n.name === 'Fetch')!.executeOnce).toBe(true);
			expect(result.nodes.find((n) => n.name === 'Handler')!.executeOnce).toBeUndefined();
		});
	});

	describe('.branch() functional syntax', () => {
		it('should parse .branch() as IF node with true/false branches', () => {
			const code = `workflow({ name: 'Branch Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    items.branch(
      (item) => item.json.status === 'active',
      (items) => {
        const true_Branch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 }));
      },
      (items) => {
        const false_Branch = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {}, version: 3 }));
      },
    );
  });
});`;

			const result = parseDataFlowCode(code);

			// Manual Trigger → If node
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns).toHaveLength(1);
			expect(triggerConns![0]).toHaveLength(1);
			expect(triggerConns![0]![0].node).toBe('If');

			// If node should have two outputs: true → True Branch, false → False Branch
			const ifConns = result.connections['If']?.main;
			expect(ifConns).toHaveLength(2);
			expect(ifConns![0]).toEqual([{ node: 'True Branch', type: 'main', index: 0 }]);
			expect(ifConns![1]).toEqual([{ node: 'False Branch', type: 'main', index: 0 }]);
		});

		it('should parse nested .branch() as chained IF nodes (else-if)', () => {
			const code = `workflow({ name: 'Nested Branch' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    items.branch(
      (item) => item.json.score > 90,
      (items) => {
        const grade_A = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Grade A', params: {}, version: 3 }));
      },
      (items) => {
        items.branch(
          (item) => item.json.score > 70,
          (items) => {
            const grade_B = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Grade B', params: {}, version: 3 }));
          },
          (items) => {
            const grade_F = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Grade F', params: {}, version: 3 }));
          },
        );
      },
    );
  });
});`;

			const result = parseDataFlowCode(code);

			// Trigger → first If
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns![0]![0].node).toBe('If');

			// First IF true → Grade A, false → second IF
			const if1Conns = result.connections['If']?.main;
			expect(if1Conns![0]).toEqual([{ node: 'Grade A', type: 'main', index: 0 }]);
			expect(if1Conns![1]).toEqual([{ node: 'If 1', type: 'main', index: 0 }]);

			// Second IF true → Grade B, false → Grade F
			const if2Conns = result.connections['If 1']?.main;
			expect(if2Conns![0]).toEqual([{ node: 'Grade B', type: 'main', index: 0 }]);
			expect(if2Conns![1]).toEqual([{ node: 'Grade F', type: 'main', index: 0 }]);
		});
	});

	describe('.route() functional syntax', () => {
		it('should parse .route() as Switch node with case branches', () => {
			const code = `workflow({ name: 'Route Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    items.route((item) => item.json.destination, {
      London: (items) => {
        const london_Handler = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'London Handler', params: {}, version: 3 }));
      },
      'New York': (items) => {
        const new_York_Handler = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'New York Handler', params: {}, version: 3 }));
      },
      default: (items) => {
        const default_Handler = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Default Handler', params: {}, version: 3 }));
      },
    });
  });
});`;

			const result = parseDataFlowCode(code);

			// Manual Trigger → Switch
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns).toHaveLength(1);
			expect(triggerConns![0]![0].node).toBe('Switch');

			// Switch should have 3 outputs: London, New York, Default
			const switchConns = result.connections['Switch']?.main;
			expect(switchConns).toHaveLength(3);
			expect(switchConns![0]).toEqual([{ node: 'London Handler', type: 'main', index: 0 }]);
			expect(switchConns![1]).toEqual([{ node: 'New York Handler', type: 'main', index: 0 }]);
			expect(switchConns![2]).toEqual([{ node: 'Default Handler', type: 'main', index: 0 }]);
		});
	});

	describe('.handleError() functional syntax', () => {
		it('should parse .handleError() as error handler on node', () => {
			const code = `workflow({ name: 'Error Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://example.com' },
      version: 4,
    }).handleError((items) => {
      const error_Handler = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Error Handler', params: {}, version: 3 }));
    });
  });
});`;

			const result = parseDataFlowCode(code);

			// Trigger → HTTP Request
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns![0]![0].node).toBe('HTTP Request');

			// HTTP Request error output → Error Handler
			const httpConns = result.connections['HTTP Request']?.main;
			expect(httpConns).toHaveLength(2); // main output + error output
			expect(httpConns![1]).toEqual([{ node: 'Error Handler', type: 'main', index: 0 }]);

			// HTTP Request should have onError: continueErrorOutput
			const httpNode = result.nodes.find((n) => n.name === 'HTTP Request');
			expect(httpNode?.onError).toBe('continueErrorOutput');
		});
	});

	describe('.batch() method syntax', () => {
		it('should parse .batch() as SplitInBatches node', () => {
			const code = `workflow({ name: 'Batch Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const source = items.map((item) => executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://example.com' },
      version: 4,
    }));
    source.batch((items) => {
      const process_Item = items.map((item) => executeNode({ type: 'n8n-nodes-base.set', name: 'Process Item', params: {}, version: 3 }));
    });
  });
});`;

			const result = parseDataFlowCode(code);

			// Should have SplitInBatches node
			const batchNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
			expect(batchNode).toBeDefined();

			// HTTP Request → SplitInBatches
			const httpConns = result.connections['HTTP Request']?.main;
			expect(httpConns![0]).toEqual(
				expect.arrayContaining([expect.objectContaining({ node: batchNode!.name })]),
			);
		});
	});

	describe('filter parsing', () => {
		it('should parse .filter() as Filter node with kept output', () => {
			const code = `workflow({ name: 'Filter' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const data = items.map((item) =>
      executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 }),
    );
    const active = data.filter((item) => item.json.status === 'active');
    const notify = active.map((item) =>
      executeNode({ type: 'n8n-nodes-base.httpRequest', name: 'Notify', params: { url: 'https://example.com/notify' }, version: 4 }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			// Should have: Trigger, HTTP Request, Filter (from .filter()), Notify
			const httpNode = result.nodes.find((n) => n.name === 'HTTP Request');
			const filterNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.filter');
			const notifyNode = result.nodes.find((n) => n.name === 'Notify');

			expect(httpNode).toBeDefined();
			expect(filterNode).toBeDefined();
			expect(notifyNode).toBeDefined();

			// HTTP Request → Filter
			expect(result.connections[httpNode!.name!]?.main![0]).toEqual(
				expect.arrayContaining([expect.objectContaining({ node: filterNode!.name })]),
			);

			// Filter kept output (index 0) → Notify
			expect(result.connections[filterNode!.name!]?.main![0]).toEqual(
				expect.arrayContaining([expect.objectContaining({ node: 'Notify' })]),
			);
		});
	});

	describe('imperative try/catch rejection', () => {
		it('should throw on try/catch with hint to use .handleError()', () => {
			const code = `workflow({ name: 'Multi Node Error Handling' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    try {
      const hTTP_Request = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' }, version: 4 });
      const transform = executeNode({ type: 'n8n-nodes-base.set', name: 'Transform', params: {}, version: 3 });
    } catch (e) {
      const error_Handler = executeNode({ type: 'n8n-nodes-base.set', name: 'Error Handler', params: {}, version: 3 });
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.handleError\(\)/);
		});

		it('should throw on single-node try/catch with hint to use .handleError()', () => {
			const code = `workflow({ name: 'Error Handling' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    try {
      const hTTP_Request = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' }, version: 4 });
    } catch (e) {
      const error_Handler = executeNode({ type: 'n8n-nodes-base.set', name: 'Error Handler', params: {}, version: 3 });
    }
  });
});`;

			expect(() => parseDataFlowCode(code)).toThrow(/\.handleError\(\)/);
		});
	});

	describe('outputSampleData parsing', () => {
		it('should extract outputSampleData from onTrigger as output on the trigger node', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [{ status: 'active' }] }, (items) => {
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes).toHaveLength(1);
			expect(result.nodes[0].output).toEqual([{ status: 'active' }]);
		});

		it('should extract outputSampleData from executeNode as output on the node', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const set = executeNode({
      type: 'n8n-nodes-base.set',
      params: {},
      version: 3,
      outputSampleData: [{ greeting: 'hello' }],
    });
  });
});`;

			const result = parseDataFlowCode(code);

			const setNode = result.nodes.find((n) => n.type === 'n8n-nodes-base.set');
			expect(setNode).toBeDefined();
			expect(setNode!.output).toEqual([{ greeting: 'hello' }]);
		});

		it('should collect outputSampleData from all nodes into WorkflowJSON.pinData', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [{ id: 1 }] }, (items) => {
    const fetch = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      name: 'Fetch',
      params: { url: 'https://example.com' },
      version: 4,
      outputSampleData: [{ data: 'response' }],
    });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.pinData).toBeDefined();
			expect(result.pinData!['Manual Trigger']).toEqual([{ id: 1 }]);
			expect(result.pinData!['Fetch']).toEqual([{ data: 'response' }]);
		});

		it('should not include pinData when no nodes have outputSampleData', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const set = executeNode({ type: 'n8n-nodes-base.set', params: {}, version: 3 });
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.pinData).toBeUndefined();
			expect(result.nodes[0].output).toBeUndefined();
			expect(result.nodes[1].output).toBeUndefined();
		});

		it('should handle outputSampleData with multiple items', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [{ id: 1 }, { id: 2 }, { id: 3 }] }, (items) => {
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes[0].output).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
			expect(result.pinData!['Manual Trigger']).toHaveLength(3);
		});

		it('should ignore empty outputSampleData array', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [] }, (items) => {
  });
});`;

			const result = parseDataFlowCode(code);

			expect(result.nodes[0].output).toBeUndefined();
			expect(result.pinData).toBeUndefined();
		});

		it('should extract outputSampleData from executeNode inside .map()', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const result = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.emailSend',
        name: 'Send Email',
        params: { toEmail: item.json.email },
        version: 2,
        outputSampleData: [{}],
      }),
    );
  });
});`;

			const result = parseDataFlowCode(code);

			const emailNode = result.nodes.find((n) => n.name === 'Send Email');
			expect(emailNode).toBeDefined();
			expect(emailNode!.output).toEqual([{}]);
			expect(result.pinData!['Send Email']).toEqual([{}]);
		});

		it('should round-trip outputSampleData through parse → generate → re-parse', () => {
			const { generateDataFlowWorkflowCode } = require('./index');
			const code = `workflow({ name: 'Round Trip' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, outputSampleData: [{ status: 'active' }] }, (items) => {
    const fetch = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      name: 'Fetch',
      params: { url: 'https://example.com' },
      version: 4,
      outputSampleData: [{ data: 'response' }],
    });
  });
});`;

			const parsed = parseDataFlowCode(code);
			const reGenerated = generateDataFlowWorkflowCode(parsed);
			const reParsed = parseDataFlowCode(reGenerated);

			// output on nodes should survive round-trip
			expect(reParsed.nodes).toEqual(parsed.nodes);
			expect(reParsed.connections).toEqual(parsed.connections);
			expect(reParsed.pinData).toEqual(parsed.pinData);
		});
	});

	describe('parseDataFlowCodeToGraph', () => {
		it('should return a SemanticGraph with nodes and roots', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const result = items.map((item) =>
      executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 }),
    );
  });
});`;

			const graph = parseDataFlowCodeToGraph(code);

			expect(graph.nodes.size).toBe(2);
			expect(graph.roots).toContain('Manual Trigger');
			// HTTP Request should not be a root (it has incoming)
			const httpNode = [...graph.nodes.values()].find(
				(n) => n.type === 'n8n-nodes-base.httpRequest',
			)!;
			expect(graph.roots).not.toContain(httpNode.name);
		});

		it('should store semantic connections on nodes', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const result = items.map((item) =>
      executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 }),
    );
  });
});`;

			const graph = parseDataFlowCodeToGraph(code);

			const trigger = [...graph.nodes.values()].find(
				(n) => n.type === 'n8n-nodes-base.manualTrigger',
			)!;
			const httpNode = [...graph.nodes.values()].find(
				(n) => n.type === 'n8n-nodes-base.httpRequest',
			)!;

			// Trigger should have output0 → HTTP Request
			const output = trigger.outputs.get('output0');
			expect(output).toBeDefined();
			expect(output![0].target).toBe(httpNode.name);

			// HTTP should have input from trigger
			const input = httpNode.inputSources.get('input0');
			expect(input).toBeDefined();
			expect(input![0].from).toBe(trigger.name);
		});

		it('should store AI subnodes on parent node', () => {
			const code = `workflow({ name: 'AI' }, () => {
  onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {}, version: 1 }, (items) => {
    const agent = executeNode({
      type: '@n8n/n8n-nodes-langchain.agent',
      params: { agent: 'conversationalAgent' },
      version: 1,
      subnodes: {
        model: languageModel({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          params: { model: 'gpt-4' },
          version: 1,
        }),
      },
    });
  });
});`;

			const graph = parseDataFlowCodeToGraph(code);

			const agent = [...graph.nodes.values()].find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.agent',
			)!;
			expect(agent.subnodes).toHaveLength(1);
			expect(agent.subnodes[0].connectionType).toBe('ai_languageModel');

			// Model node should exist in graph but NOT have 'main' connections
			const model = graph.nodes.get(agent.subnodes[0].subnodeName)!;
			expect(model).toBeDefined();
			expect(model.outputs.size).toBe(0);
		});

		it('should produce equivalent JSON when converted via semanticGraphToWorkflowJSON', () => {
			const code = `workflow({ name: 'Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const result = items.map((item) =>
      executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://example.com' }, version: 4 }),
    );
  });
});`;

			const directJson = parseDataFlowCode(code);
			const graph = parseDataFlowCodeToGraph(code);
			const graphJson = semanticGraphToWorkflowJSON(graph, 'Test');

			expect(graphJson.nodes).toEqual(directJson.nodes);
			expect(graphJson.connections).toEqual(directJson.connections);
		});
	});

	describe('$("NodeName") round-trip via generator', () => {
		it('should round-trip non-predecessor $("NodeName") references', () => {
			const { generateDataFlowWorkflowCode } = require('./index');

			// Code with non-predecessor var ref: edit_Fields is NOT the source of notify
			const code = `workflow({ name: 'NonPred Round Trip' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const edit_Fields = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Edit Fields',
        params: { options: {} },
        version: 3,
      }),
    );
    const notify = items.map((item) =>
      executeNode({
        type: 'n8n-nodes-base.telegram',
        name: 'Notify',
        params: { chatId: edit_Fields.json.telegramChatID },
        version: 1,
      }),
    );
  });
});`;

			const parsed = parseDataFlowCode(code);
			// Parser should emit $('Edit Fields') reference
			expect(parsed.nodes.find((n) => n.name === 'Notify')!.parameters!.chatId).toBe(
				"={{ $('Edit Fields').item.json.telegramChatID }}",
			);

			// Generator should convert back to variable reference
			const regenerated = generateDataFlowWorkflowCode(parsed);
			expect(regenerated).toContain('edit_Fields.json.telegramChatID');
			expect(regenerated).not.toContain("$('Edit Fields')");

			// Re-parse should produce same JSON
			const reParsed = parseDataFlowCode(regenerated);
			expect(reParsed.nodes).toEqual(parsed.nodes);
			expect(reParsed.connections).toEqual(parsed.connections);
		});
	});
});
