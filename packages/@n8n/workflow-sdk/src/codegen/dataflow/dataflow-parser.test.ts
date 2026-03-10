import { parseDataFlowCode } from './dataflow-parser';

describe('parseDataFlowCode', () => {
	describe('if/else branching connections', () => {
		it('should not create spurious connections from trigger to branch nodes', () => {
			const code = `workflow({ name: 'IF Workflow' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    if (items[0].json.status === 'active') {
      const true_Branch = node({ type: 'n8n-nodes-base.set', name: 'True Branch', params: {}, version: 3 })(items);
    } else {
      const false_Branch = node({ type: 'n8n-nodes-base.set', name: 'False Branch', params: {}, version: 3 })(items);
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
      const step1 = node({ type: 'n8n-nodes-base.set', name: 'Step 1', params: {}, version: 3 })(items);
      const step2 = node({ type: 'n8n-nodes-base.set', name: 'Step 2', params: {}, version: 3 })(step1);
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
        const active_Handler = node({ type: 'n8n-nodes-base.set', name: 'Active Handler', params: {}, version: 3 })(items);
        break;
      }
      case 'inactive': {
        const inactive_Handler = node({ type: 'n8n-nodes-base.set', name: 'Inactive Handler', params: {}, version: 3 })(items);
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
