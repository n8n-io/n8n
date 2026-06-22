import { workflowNameSchema } from '../base-workflow.dto';

describe('workflowNameSchema', () => {
	test.each([
		'My Workflow',
		'Sales > Q1', // bare comparison operators stay valid
		'A < B',
		'a < b > c',
		'1 < 2 and 3 > 2',
		'name with "quotes" & ampersand',
	])('accepts %j', (name) => {
		expect(workflowNameSchema.safeParse(name).success).toBe(true);
	});

	test.each([
		'<script>alert(1)</script>',
		'<img src=x onerror=alert(1)>',
		'<b>bold</b>',
		'</div>',
		'prefix <a href="x">link</a> suffix',
		'<a href="a>b">x</a>', // crafted attribute containing `>`
	])('rejects markup %j', (name) => {
		expect(workflowNameSchema.safeParse(name).success).toBe(false);
	});

	it('rejects empty names', () => {
		expect(workflowNameSchema.safeParse('').success).toBe(false);
	});

	it('rejects names longer than 128 characters', () => {
		expect(workflowNameSchema.safeParse('a'.repeat(129)).success).toBe(false);
	});
});
