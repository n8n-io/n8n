import { parseDataFlowCode } from './dataflow-parser';

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

	describe('if/else branching connections', () => {
		it('should not create spurious connections from trigger to branch nodes', () => {
			const code = `workflow({ name: 'IF Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    if (items[0].json.status === 'active') {
      const true_Branch = executeNode({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 });
    } else {
      const false_Branch = executeNode({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {}, version: 3 });
    }
  });
});`;

			const result = parseDataFlowCode(code);

			// Manual Trigger should ONLY connect to If node
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

		it('should not create spurious connections for chained nodes inside if branch', () => {
			const code = `workflow({ name: 'IF Chain' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    if (items[0].json.active === true) {
      const step1 = executeNode({ type: 'n8n-nodes-base.set', name: 'Step 1', params: {}, version: 3 });
      const step2 = executeNode({ type: 'n8n-nodes-base.set', name: 'Step 2', params: {}, version: 3 });
    }
  });
});`;

			const result = parseDataFlowCode(code);

			// Manual Trigger should ONLY connect to If
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns).toHaveLength(1);
			expect(triggerConns![0]).toHaveLength(1);
			expect(triggerConns![0]![0].node).toBe('If');

			// If output 0 → Step 1
			const ifConns = result.connections['If']?.main;
			expect(ifConns![0]).toEqual([{ node: 'Step 1', type: 'main', index: 0 }]);

			// Step 1 → Step 2
			const step1Conns = result.connections['Step 1']?.main;
			expect(step1Conns![0]).toEqual([{ node: 'Step 2', type: 'main', index: 0 }]);
		});
	});

	describe('switch branching connections', () => {
		it('should not create spurious connections from trigger to case nodes', () => {
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

			const result = parseDataFlowCode(code);

			// Manual Trigger should ONLY connect to Switch
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns).toHaveLength(1);
			expect(triggerConns![0]).toHaveLength(1);
			expect(triggerConns![0]![0].node).toBe('Switch');
		});
	});

	describe('else-if chain', () => {
		it('should parse else-if as chained IF nodes', () => {
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

			const result = parseDataFlowCode(code);

			// Should have: Trigger, If, Grade A, If1, Grade B, Grade F
			// First IF: score > 90 → true: Grade A, false: second IF
			const triggerConns = result.connections['Manual Trigger']?.main;
			expect(triggerConns).toHaveLength(1);
			expect(triggerConns![0]).toHaveLength(1);
			expect(triggerConns![0]![0].node).toBe('If');

			// First IF true → Grade A
			const if1Conns = result.connections['If']?.main;
			expect(if1Conns![0]).toEqual([{ node: 'Grade A', type: 'main', index: 0 }]);

			// First IF false → second IF (If 1)
			expect(if1Conns![1]).toEqual([{ node: 'If 1', type: 'main', index: 0 }]);

			// Second IF true → Grade B, false → Grade F
			const if2Conns = result.connections['If 1']?.main;
			expect(if2Conns![0]).toEqual([{ node: 'Grade B', type: 'main', index: 0 }]);
			expect(if2Conns![1]).toEqual([{ node: 'Grade F', type: 'main', index: 0 }]);
		});
	});

	describe('for...of loop parsing', () => {
		it('should parse for...of as SplitInBatches with loop-back connection', () => {
			const code = `workflow({ name: 'For Of Loop' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const data = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com/items' },
      version: 4,
    });
    for (const item of data) {
      const process_Item = executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Process Item',
        params: {},
        version: 3,
      });
    }
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

		it('should connect nodes after for...of to SplitInBatches done output', () => {
			const code = `workflow({ name: 'For Then Continue' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const data = executeNode({
      type: 'n8n-nodes-base.httpRequest',
      params: { url: 'https://api.example.com' },
      version: 4,
    });
    for (const item of data) {
      const process = executeNode({
        type: 'n8n-nodes-base.set',
        name: 'Process',
        params: {},
        version: 3,
      });
    }
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
});
