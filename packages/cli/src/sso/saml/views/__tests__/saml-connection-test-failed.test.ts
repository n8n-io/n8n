import { getSamlConnectionTestFailedView } from '../saml-connection-test-failed';

const basicXssPayload = '<script>alert("1");</script>';
const basicXssMitigated = '&lt;script&gt;alert(&quot;1&quot;);&lt;/script&gt;';

describe('SAML Connection Test Failed', () => {
	test('should not allow XSS via error message', () => {
		const result = getSamlConnectionTestFailedView('Test ' + basicXssPayload);
		expect(result).not.toMatch(basicXssPayload);
		expect(result).toMatch(basicXssMitigated);
	});

	test('should not allow XSS via attributes', () => {
		const result = getSamlConnectionTestFailedView('', {
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
			getSamlConnectionTestFailedView('', {
				firstName: 'No',
				lastName: 'Email',
				userPrincipalName: 'test@example.com',
			}),
		).toMatch('<strong>Email:</strong> (n/a)');
	});
});
