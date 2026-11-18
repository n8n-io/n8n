import { RuleTester } from '@typescript-eslint/rule-tester';

import { PreserveErrorCauseRule } from './preserve-error-cause.js';

const ruleTester = new RuleTester();

ruleTester.run('preserve-error-cause', PreserveErrorCauseRule, {
	valid: [
		{ code: 'try { a(); } catch (e) { throw e; }' },
		{ code: 'try { a(); } catch (e) { throw new Error("Failed", { cause: e }); }' },
		{ code: 'try { a(); } catch (error) { throw new NodeOperationError(this.getNode(), error); }' },
		{
			code: 'try { a(); } catch (error) { throw new NodeApiError(node, error as JsonObject, { itemIndex: i }); }',
		},
		{
			code: 'try { a(); } catch (e) { const err = e as Error; throw new UserError("Bad input", { cause: err }); }',
		},
		{
			code: 'try { a(); } catch (e) { throw new OperationalError(`Request failed: ${String(e)}`, { cause: e }); }',
		},
		// Message only is allowed unless checkMessageOnly is on.
		{ code: 'try { a(); } catch (e) { throw new Error(e.message); }' },
		// Throws inside nested functions belong to them, not to this catch.
		{ code: 'try { a(); } catch (e) { queue.push(() => { throw new Error("later"); }); log(e); }' },
		// Not a new error.
		{ code: 'try { a(); } catch (e) { throw wrap(e); }' },
		{
			code: 'try { a(); } catch { throw new Error("x"); }',
			options: [{ checkMissingBinding: false }],
		},
	],
	invalid: [
		{
			code: 'try { a(); } catch (e) { throw new Error("Something went wrong"); }',
			errors: [{ messageId: 'missingCause' }],
		},
		{
			code: 'try { a(); } catch (error) { log(error); throw new NodeOperationError(this.getNode(), "Request failed"); }',
			errors: [{ messageId: 'missingCause' }],
		},
		{
			code: 'try { a(); } catch (e) { if (x) { throw new UserError("Invalid JSON"); } throw e; }',
			errors: [{ messageId: 'missingCause' }],
		},
		{
			code: 'try { a(); } catch { throw new UserError("Invalid JSON"); }',
			errors: [{ messageId: 'noBinding' }],
		},
		{
			code: 'try { a(); } catch (e) { throw new Error(e.message); }',
			options: [{ checkMessageOnly: true }],
			errors: [{ messageId: 'messageOnly' }],
		},
		{
			code: 'try { a(); } catch (e) { const err = e as Error; throw new Error(`Failed: ${err.message}`); }',
			options: [{ checkMessageOnly: true }],
			errors: [{ messageId: 'messageOnly' }],
		},
	],
});
