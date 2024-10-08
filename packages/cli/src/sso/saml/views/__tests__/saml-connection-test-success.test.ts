import { getSamlConnectionTestSuccessView } from '../saml-connection-test-success';

const basicXssPayload = '<script>alert("1");</script>';
const basicXssMitigated = '&lt;script&gt;alert(&quot;1&quot;);&lt;/script&gt;';

describe('SAML Connection Test Succeeded', () => {
	test('should not allow XSS via attributes', () => {
		const result = getSamlConnectionTestSuccessView({
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'McXss' + basicXssPayload,
			userPrincipalName: 'test@example.com',
		});
		expect(result).not.toMatch(basicXssPayload);
		expect(result).toMatch(basicXssMitigated);
	});

	test('should replace undefined with (n/a)', () => {
		expect(
			getSamlConnectionTestSuccessView({
				firstName: 'No',
				lastName: 'Email',
				userPrincipalName: 'test@example.com',
			}),
		).toMatch('<strong>Email:</strong> (n/a)');
	});
});
