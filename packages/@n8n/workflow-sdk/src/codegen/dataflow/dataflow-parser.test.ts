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
});
