import { validateNodeName } from './validation';

describe('validateNodeName', () => {
	describe('valid names', () => {
		it.each([
			'n8n-nodes-myapp',
			'n8n-nodes-my-app',
			'@mycompany/n8n-nodes-myapp',
			'@mycompany/n8n-nodes-my-app',
			'@my-company/n8n-nodes-my-app',
			'@net.christianto/n8n-nodes-myapp',
			'@net.christian.to/n8n-nodes-myapp',
			'@net.christianto/n8n-nodes-my-app',
			'@my.company-name/n8n-nodes-my-app',
		])('should accept "%s"', (name) => {
			expect(validateNodeName(name)).toBeUndefined();
		});
	});

	describe('invalid names', () => {
		it.each([
			'myapp',
			'@mycompany/myapp',
			'@mycompany/n8n-nodes-',
			'n8n-nodes-',
			'@/n8n-nodes-myapp',
			'@MyCompany/n8n-nodes-myapp',
			'@Net.Christianto/n8n-nodes-myapp',
			'@my_company/n8n-nodes-myapp',
			'@my company/n8n-nodes-myapp',
			'n8n-nodes-MyApp',
			'@mycompany/n8n-nodes-my_app',
		])('should reject "%s"', (name) => {
			expect(validateNodeName(name)).toBe(
				"Must start with 'n8n-nodes-' or '@org/n8n-nodes-'. Examples: n8n-nodes-my-app, @mycompany/n8n-nodes-my-app",
			);
		});
	});

	it('should return undefined for an empty name', () => {
		expect(validateNodeName('')).toBeUndefined();
	});
});
