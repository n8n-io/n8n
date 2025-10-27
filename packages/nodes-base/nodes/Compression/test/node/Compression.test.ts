import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import os from 'node:os';
import path from 'path';

if (os.platform() !== 'win32') {
	describe('Execute Compression Node', () => {
		const testHarness = new NodeTestHarness();
		const workflowData = testHarness.readWorkflowJSON('workflow.compression.json');

		const node = workflowData.nodes.find((n) => n.name === 'Read Binary File')!;
		node.parameters.filePath = path.join(__dirname, 'lorem.txt');

		const tests: WorkflowTestData[] = [
			{
				description: 'nodes/Compression/test/node/workflow.compression.json',
				input: {
					workflowData,
				},
				output: {
					assertBinaryData: true,
					nodeData: {
						Compression1: [
							[
								{
									json: {},
									binary: {
										file_0: {
											mimeType: 'text/plain',
											fileType: 'text',
											fileExtension: 'txt',
											data: 'TG9yZW0gSXBzdW0KIk5lcXVlIHBvcnJvIHF1aXNxdWFtIGVzdCBxdWkgZG9sb3JlbSBpcHN1bSBxdWlhIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciwgYWRpcGlzY2kgdmVsaXQuLi4iCiJUaGVyZSBpcyBubyBvbmUgd2hvIGxvdmVzIHBhaW4gaXRzZWxmLCB3aG8gc2Vla3MgYWZ0ZXIgaXQgYW5kIHdhbnRzIHRvIGhhdmUgaXQsIHNpbXBseSBiZWNhdXNlIGl0IGlzIHBhaW4uLi4iCkxvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQuIFZpdmFtdXMgZWZmaWNpdHVyIGF1Z3VlIGVnZXQgbGVvIGF1Y3RvciBpbnRlcmR1bS4gTWFlY2VuYXMgcGhhcmV0cmEgcGVsbGVudGVzcXVlIGp1c3RvIGF0IHBvcnR0aXRvci4gUGhhc2VsbHVzIHNvZGFsZXMgYWNjdW1zYW4gcG9zdWVyZS4gU2VkIHVybmEgYXVndWUsIG1hbGVzdWFkYSBldCBwbGFjZXJhdCBlZ2V0LCBhbGlxdWV0IHNlZCB0b3J0b3IuIFByYWVzZW50IGNvbW1vZG8sIGVyb3MgdmVsIGZlcm1lbnR1bSBhbGlxdWV0LCBkaWFtIGZlbGlzIHRlbXB1cyB1cm5hLCBuZWMgcG9zdWVyZSBsaWd1bGEgZWxpdCBxdWlzIGRpYW0uIFNlZCBub24gbG9yZW0gdm9sdXRwYXQsIG1vbGVzdGllIG5pYmggZWdldCwgcHVsdmluYXIgZWxpdC4gTWFlY2VuYXMgYWMgdmFyaXVzIGV4LCBxdWlzIHVsdHJpY2VzIHNhcGllbi4gVml2YW11cyBlZ2VzdGFzLCByaXN1cyBzaXQgYW1ldCBtYWxlc3VhZGEgZWxlaWZlbmQsIG1hc3NhIHRvcnRvciBlbGVtZW50dW0gdHVycGlzLCBpZCBzb2xsaWNpdHVkaW4gZXN0IGxpYmVybyBzZWQgZHVpLiBOdWxsYSBpZCBwdWx2aW5hciBzZW0sIG5lYyBoZW5kcmVyaXQgbGFjdXMuCgpWZXN0aWJ1bHVtIGFsaXF1YW0gZXQgcHVydXMgc2l0IGFtZXQgdWxsYW1jb3JwZXIuIE5hbSB2aXZlcnJhIHRyaXN0aXF1ZSBmaW5pYnVzLiBWaXZhbXVzIGRpZ25pc3NpbSB0aW5jaWR1bnQgZXN0LiBEb25lYyBqdXN0byB0dXJwaXMsIGZldWdpYXQgc29sbGljaXR1ZGluIHN1c2NpcGl0IGEsIGJsYW5kaXQgY3Vyc3VzIHF1YW0uIER1aXMgdml2ZXJyYSBzZW0gdXQgbGFjaW5pYSBzZW1wZXIuIEFlbmVhbiB1bHRyaWNlcyBhbnRlIGV0IG5pc2kgc2VtcGVyIGRhcGlidXMuIE1vcmJpIHF1aXMgZnJpbmdpbGxhIG1hZ25hLiBOdW5jIGxpZ3VsYSBhcmN1LCBhbGlxdWFtIHF1aXMgbGVvIGV0LCBjb21tb2RvIG1vbGVzdGllIGxlY3R1cy4gUHJvaW4gYWMgbGVvIGZlcm1lbnR1bSwgY29udmFsbGlzIGVyYXQgaW4sIHVsdHJpY2llcyBtYWduYS4gTW9yYmkgbG9yZW0gYXJjdSwgY29uZ3VlIHNlZCBkaWFtIGlkLCBtb2xlc3RpZSBhbGlxdWV0IGVyYXQuIEFsaXF1YW0gdXQgZHVpIHBvc3VlcmUsIHB1bHZpbmFyIHNhcGllbiBzZWQsIGludGVyZHVtIHNhcGllbi4gRG9uZWMgc29sbGljaXR1ZGluIGxpYmVybyBpbXBlcmRpZXQgYWxpcXVhbSBhbGlxdWFtLgoKRG9uZWMgbm9uIG9kaW8gbWFzc2EuIE1hZWNlbmFzIGV1IGludGVyZHVtIGlwc3VtLCBhdCBncmF2aWRhIHR1cnBpcy4gVmVzdGlidWx1bSBldSBtb2xsaXMgdHVycGlzLCBlZ2V0IGZhdWNpYnVzIGxpZ3VsYS4gVmVzdGlidWx1bSBhbnRlIGlwc3VtIHByaW1pcyBpbiBmYXVjaWJ1cyBvcmNpIGx1Y3R1cyBldCB1bHRyaWNlcyBwb3N1ZXJlIGN1YmlsaWEgY3VyYWU7IEFlbmVhbiB0cmlzdGlxdWUgZXggbmVjIHJpc3VzIGJpYmVuZHVtLCBldSB1bGxhbWNvcnBlciBlcm9zIHBoYXJldHJhLiBVdCBmaW5pYnVzIGp1c3RvIGxlY3R1cywgbm9uIHZhcml1cyBhbnRlIHZvbHV0cGF0IGV1LiBQZWxsZW50ZXNxdWUgdHVycGlzIGVyb3MsIG1vbGVzdGllIGVnZXQgZW5pbSBuZWMsIGVsZW1lbnR1bSBwb3N1ZXJlIHJpc3VzLiBQaGFzZWxsdXMgZGljdHVtLCBlc3Qgdml0YWUgdml2ZXJyYSBlZ2VzdGFzLCBlbGl0IGVyb3MgcG9zdWVyZSBsb3JlbSwgaWQgZmluaWJ1cyBzYXBpZW4gbnVsbGEgc2l0IGFtZXQgYW50ZS4gRXRpYW0gaW4gcHVydXMgaWQgdGVsbHVzIHBvcnR0aXRvciBwb3N1ZXJlLgoKRG9uZWMgbm9uIGx1Y3R1cyBlbmltLiBWaXZhbXVzIHNvbGxpY2l0dWRpbiB0dXJwaXMgcXVpcyBxdWFtIGZlcm1lbnR1bSBwb3J0dGl0b3IuIFByb2luIGlkIHRpbmNpZHVudCBlcmF0LiBBZW5lYW4gaGVuZHJlcml0IHNpdCBhbWV0IGFyY3UgdmVuZW5hdGlzIHZ1bHB1dGF0ZS4gUGVsbGVudGVzcXVlIG5vbiBlcm9zIHZvbHV0cGF0LCB2ZXN0aWJ1bHVtIG1pIG5vbiwgdm9sdXRwYXQgYXJjdS4gSW4gYWMgdWxsYW1jb3JwZXIgc2FwaWVuLiBVdCBzaXQgYW1ldCB1cm5hIGFjIG51bmMgYWNjdW1zYW4gYXVjdG9yLiBGdXNjZSBhY2N1bXNhbiBsaWJlcm8gdmVsIHByZXRpdW0gaWFjdWxpcy4gUHJvaW4gc2VkIHZlaGljdWxhIGVyYXQuIEludGVnZXIgZmF1Y2lidXMgYXVndWUgbnVuYywgbmVjIGJsYW5kaXQgYXJjdSBsdWN0dXMgZGlnbmlzc2ltLiBNYWVjZW5hcyBhbGlxdWFtIHNvbGxpY2l0dWRpbiBkdWksIGF0IHBsYWNlcmF0IGVyYXQgbWFsZXN1YWRhIHV0LiBTdXNwZW5kaXNzZSBub24gcnV0cnVtIG9kaW8sIHV0IHVsdHJpY2llcyBtYXNzYS4KCk1vcmJpIHNpdCBhbWV0IHJpc3VzIHZlc3RpYnVsdW0sIHZlaGljdWxhIGVsaXQgdmVsLCB1bGxhbWNvcnBlciBhbnRlLiBBZW5lYW4gcnV0cnVtIHBlbGxlbnRlc3F1ZSBmZWxpcywgbmVjIHBoYXJldHJhIGlwc3VtIGNvbnNlY3RldHVyIHF1aXMuIE1hdXJpcyBpbiBlbGl0IGV1IG51bGxhIGRhcGlidXMgZmV1Z2lhdC4gSW4gdmVzdGlidWx1bSBtYXNzYSBpZCBsYW9yZWV0IHNvZGFsZXMuIFN1c3BlbmRpc3NlIG9ybmFyZSBjb25ndWUgbWV0dXMsIGluIHVsdHJpY2llcyBuZXF1ZSBjb25zZXF1YXQgbmVjLiBJbnRlcmR1bSBldCBtYWxlc3VhZGEgZmFtZXMgYWMgYW50ZSBpcHN1bSBwcmltaXMgaW4gZmF1Y2lidXMuIE1hZWNlbmFzIHNlZCBsdWN0dXMgdmVsaXQuIFF1aXNxdWUgaW4gbnVuYyBwZWxsZW50ZXNxdWUsIGFsaXF1ZXQgcXVhbSBpbiwgYWNjdW1zYW4gbGVjdHVzLiBWZXN0aWJ1bHVtIGRhcGlidXMgdG9ydG9yIGFjIG1ldHVzIGZldWdpYXQgY3Vyc3VzLiBTZWQgbmVjIHNjZWxlcmlzcXVlIGFyY3UuCg==',
											fileName: 'lorem.txt',
											fileSize: '3.07 kB',
										},
									},
								},
							],
						],
					},
				},
			},
		];

		for (const testData of tests) {
			testHarness.setupTest(testData);
		}
	});
} else {
	describe('Execute Compression Node', () => {
		it('Skipped because compression results are different on platform win32', () => {
			expect(true).toBe(true);
		});
	});
}
