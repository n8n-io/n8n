import { findLineInWorkflowJson } from '../workflow-json-line-finder';

const sampleWorkflow = `{
  "id": "wf1",
  "name": "Test",
  "nodes": [
    {
      "parameters": {
        "errorMessage": "NO!"
      },
      "type": "n8n-nodes-base.stopAndError",
      "typeVersion": 1,
      "position": [
        208,
        0
      ],
      "id": "node-stop",
      "name": "Stop and Error"
    }
  ],
  "connections": {}
}`;

describe('findLineInWorkflowJson', () => {
	it('finds the node id line', () => {
		expect(findLineInWorkflowJson(sampleWorkflow, { nodeId: 'node-stop' })).toBe(15);
	});

	it('finds a parameter key line within the node', () => {
		expect(
			findLineInWorkflowJson(sampleWorkflow, {
				nodeId: 'node-stop',
				jsonPath: 'parameters.errorMessage',
			}),
		).toBe(7);
	});

	it('returns null when the node id is missing', () => {
		expect(findLineInWorkflowJson(sampleWorkflow, { nodeId: 'missing' })).toBeNull();
	});
});
