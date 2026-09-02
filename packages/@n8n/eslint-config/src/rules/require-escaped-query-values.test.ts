import { RuleTester } from '@typescript-eslint/rule-tester';
import { RequireEscapedQueryValuesRule } from './require-escaped-query-values.js';

const ruleTester = new RuleTester();

const IMPORT =
	"import { escapeBackslashQuotedValue, escapeODataSearchValue, escapeODataValue } from '@utils/query-escaping';\n";

/** Prefixes the escaper import the rule requires before trusting a call. */
const withImport = (code: string) => IMPORT + code;

ruleTester.run('require-escaped-query-values', RequireEscapedQueryValuesRule, {
	valid: [
		{ code: withImport("qs.$filter = `displayName eq '${escapeODataValue(filter)}'`;") },
		{
			code: withImport(
				"const qs = { q: `name contains '${escapeBackslashQuotedValue(filter)}'` };",
			),
		},
		{ code: withImport("query.push(`name contains '${escapeBackslashQuotedValue(filter)}'`);") },
		{ code: withImport("qs.$filter += ` AND contains(subject, '${escapeODataValue(value)}')`;") },
		{ code: withImport("const query = `email LIKE '${escapeBackslashQuotedValue(email)}'`;") },

		// Escaped one hop back, through a `const`.
		{
			code: withImport(`const filterValue = escapeODataValue(encodeURI(filter));
qs.$filter = \`contains(displayName, '\${filterValue}')\`;`),
		},
		// Escaped in both arms of a conditional.
		{
			code: withImport("const q = `name contains '${filter ? escapeODataValue(filter) : ''}'`;"),
		},

		// A module constant is fixed at build time.
		{
			code: `import { DRIVE } from './interfaces';
query.push(\`mimeType = '\${DRIVE.FOLDER}'\`);`,
		},
		{
			code: `import { FOLDER_MIME } from './interfaces';
query.push(\`mimeType = '\${FOLDER_MIME}'\`);`,
		},

		// Escaped through the constructs isNeutralised looks past.
		{ code: withImport("qs.$filter = `eq '${escapeODataValue(a) || escapeODataValue(b)}'`;") },
		{ code: withImport("qs.$filter = `eq '${escapeODataValue(x) as string}'`;") },
		{ code: withImport("qs.$filter = `eq '${escapeODataValue(x)!}'`;") },

		// A quote of the other kind inside a literal is data, not a delimiter.
		{ code: withImport("qs.q = `name = \"it's\" and owner = '${escapeODataValue(ownerId)}'`;") },
		// `satisfies` is transparent, like `as` and `!`.
		{ code: withImport("qs.$filter = `eq '${escapeODataValue(x)}'` satisfies string;") },

		{ code: "qs.q = `owner = ${ownerId} and name = 'x'`;" },

		// Double-quoted literals count too, e.g. an OData `$search` phrase.
		{ code: withImport('qs.$search = `"displayName:${escapeODataSearchValue(filter)}"`;') },

		// Outside a quoted literal the value cannot close one, so the language's
		// own syntax applies and escaping is not what protects it.
		{ code: "qs.$filter = `contains(${nameProperty}, 'literal')`;" },
		{ code: 'qs.sysparm_query = `table_name=${tableName}`;' },

		// Not a query sink.
		{ code: "throw new Error(`The resource '${resource}' is unknown`);" },
		{ code: "const message = `Column '${key}' does not exist`;" },
		{ code: "items.push(`field '${name}' is missing`);" },
		{ code: "const body = { subject: `Re: '${subject}'` };" },

		// A quote already closed by the time the value is interpolated.
		{ code: "const q = `name = 'literal' and owner = ${ownerId}`;" },

		// Escaped quotes in the template do not open a literal.
		{ code: "const q = `label = \\'x\\' and owner = ${ownerId}`;" },
	],

	invalid: [
		{
			code: "qs.$filter = `displayName eq '${filter}'`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "Object.assign(body, { query: `email LIKE '${email}' ` });",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "query.push(`name contains '${filter}'`);",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "const q = filter ? `name contains '${filter}'` : undefined;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "qs['$filter'] = `fields/Title eq '${filter}'`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// Both interpolations sit inside a literal, so both are reported.
		{
			code: "qs.$filter = `startsWith(displayName, '${filter}') OR startsWith(mail, '${filter}')`;",
			errors: [{ messageId: 'escapeQueryValue' }, { messageId: 'escapeQueryValue' }],
		},
		{
			code: "const query = `name contains '${prefix}${suffix}'`;",
			errors: [{ messageId: 'escapeQueryValue' }, { messageId: 'escapeQueryValue' }],
		},
		// A `let` may be reassigned, so following it back proves nothing.
		{
			code: withImport(`let filterValue = escapeODataValue(filter);
qs.$filter = \`displayName eq '\${filterValue}'\`;`),
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// Only one arm of the conditional is escaped.
		{
			code: withImport(
				"const q = `name contains '${filter ? filter : escapeODataValue(fallback)}'`;",
			),
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// encodeURI leaves single quotes untouched, so it is not an escape.
		{
			code: "qs.$filter = `contains(subject, '${encodeURI(filter)}')`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "qs.$filter = `contains(subject, '${encodeURIComponent(filter)}')`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: 'qs.$search = `"displayName:${filter}"`;',
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// The sink is still found when reached through a choosing expression or a cast.
		{
			code: "const q = fallback || `name contains '${filter}'`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "qs.$filter = `eq '${filter}'` as string;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// Only one arm of the logical expression is escaped.
		{
			code: withImport("qs.$filter = `eq '${a || escapeODataValue(b)}'`;"),
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// The single quote inside the double-quoted literal must not be mistaken for
		// a delimiter — the interpolation below it really is inside a literal.
		{
			code: "qs.q = `name = \"it's\" and owner = '${ownerId}'`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// An escaper for a different dialect does not make this value safe.
		{
			code: "query.push(`name contains '${escapeSqlIdentifier(filter)}'`);",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// The sink is still found through a `satisfies` wrapper.
		{
			code: "qs.$filter = `eq '${filter}'` satisfies string;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// An approved name reached through a member access proves nothing.
		{
			code: `const evil = { escapeODataValue: (v: string) => v };
qs.$filter = \`eq '\${evil.escapeODataValue(filter)}'\`;`,
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		{
			code: "qs.$filter = `eq '${this.escapeODataValue(filter)}'`;",
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// A local function with an approved name is not the approved escaper.
		{
			code: `const escapeODataValue = (v: string) => v;
qs.$filter = \`eq '\${escapeODataValue(filter)}'\`;`,
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// A property of a bound parameter is not a module constant.
		{
			code: `const options = this.getNodeParameter('options', i);
query.push(\`mimeType = '\${options.fileType}'\`);`,
			errors: [{ messageId: 'escapeQueryValue' }],
		},
		// `String.replace` with a string pattern replaces only the first match.
		{
			code: `query.push(\`name contains '\${filter.replace("'", "\\\\'")}'\`);`,
			errors: [{ messageId: 'escapeQueryValue' }],
		},
	],
});
