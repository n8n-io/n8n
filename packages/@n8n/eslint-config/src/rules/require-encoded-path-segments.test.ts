import { RuleTester } from '@typescript-eslint/rule-tester';
import { RequireEncodedPathSegmentsRule } from './require-encoded-path-segments.js';

const ruleTester = new RuleTester();

const IMPORT = "import { toPathSegment } from 'n8n-workflow';\n";

/** Prefixes the encoder import the rule requires before trusting a call. */
const withImport = (code: string) => IMPORT + code;

ruleTester.run('require-encoded-path-segments', RequireEncodedPathSegmentsRule, {
	valid: [
		{ code: withImport('const endpoint = `/teams/${toPathSegment(teamId)}`;') },
		{ code: withImport('endpoint = `/case/${toPathSegment(caseId)}/task`;') },
		{ code: withImport('options.uri = `${baseUrl}/api/${toPathSegment(id)}`;') },
		{ code: withImport("await apiRequest.call(this, 'GET', `/users/${toPathSegment(id)}`);") },
		{
			code: withImport(
				"await zammadApiRequest.call(this, 'DELETE', `/tickets/${toPathSegment(id)}`);",
			),
		},
		{
			code: withImport(
				'await databricksApiRequest(this, cred, { url: `${host}/api/2.0/spaces/${toPathSegment(spaceId)}` });',
			),
		},
		{ code: withImport('this.helpers.httpRequest({ url: `${base}/o/${toPathSegment(name)}` });') },

		// Encoded one hop back, through a `const`.
		{
			code: withImport(`const tableId = toPathSegment(this.getNodeParameter('tableId', 0));
const endpoint = \`/api/database/rows/table/\${tableId}/\`;`),
		},
		// Encoded in both arms of a conditional.
		{
			code: withImport(
				'const url = `/posts/${by === "slug" ? toPathSegment(a) : toPathSegment(b)}`;',
			),
		},
		// Transparent TypeScript wrappers.
		{ code: withImport('const url = `/posts/${toPathSegment(id) as string}`;') },
		{ code: withImport('const url = `/posts/${toPathSegment(id)!}`;') },

		// A number cannot carry a delimiter.
		{ code: 'const endpoint = `/items/${Number(id)}`;' },
		{ code: 'const endpoint = `/items/${parseInt(id, 10)}`;' },
		{ code: 'const endpoint = `/items/${42}`;' },

		// A module constant is fixed at build time.
		{
			code: `import { API_VERSION } from './constants';
const endpoint = \`/api/\${API_VERSION}/users\`;`,
		},

		// An alias of the sanctioned helper is still that helper.
		{
			code: `import { toPathSegment as seg } from 'n8n-workflow';
const endpoint = \`/users/\${seg(id)}\`;`,
		},

		// A configured local helper for slash-separated paths.
		{
			code: `import { toVolumePath } from '../helpers';
const url = \`\${host}/api/2.0/fs/files/\${toVolumePath(filePath)}\`;`,
			options: [{ helpers: ['toVolumePath'] }],
		},

		// The host part is not a segment.
		{ code: 'const uri = `https://${subdomain}.example.com/api/v1`;' },
		{ code: 'const uri = `${credentials.domain}/api/v1${resource}`;' },
		{ code: 'const url = `${host}/api/2.0/clusters/list`;' },

		// A whole path handed to a request helper; its segments were encoded upstream.
		{
			code: 'function zammadApiRequest(endpoint) { const url = `${baseUrl}/api/v4/${endpoint}`; }',
		},
		{
			code: 'const ghostApiRequest = async (endpoint) => { const uri = `${credentials.url}/ghost/api/v3${endpoint}`; };',
		},
		{
			code: 'const x = { async httpRequest(resource) { const endpoint = `/${resource}/restSearch`; } };',
		},

		// After `?` or `#` the value is not in the path.
		{ code: 'const url = `/functions/list?Marker=${marker}`;' },
		{ code: 'const url = `/a/b?redirect=/${target}`;' },

		// Not a path sink.
		{ code: 'const label = `Team ${teamId}/${memberId}`;' },
		{ code: 'const body = { name: `${first}/${last}` };' },
		{ code: 'logger.info(`fetching /teams/${teamId}`);' },

		// Declarative routing, encoded.
		{
			code: "const p = { routing: { request: { url: '=/workflows/{{ toPathSegment($value) }}/activate' } } };",
		},
		{
			code: 'const p = { routing: { request: { url: \'=/collections/{{toPathSegment($parameter["collectionId"])}}/{{toPathSegment($parameter["rowId"])}}\' } } };',
		},
		{ code: "const p = { routing: { request: { url: '=/items?limit={{$parameter.limit}}' } } };" },
		// A parenthesis inside a string literal is not a call boundary.
		{
			code: 'const p = { routing: { request: { url: \'=/items/{{ toPathSegment($json.id.replace(")", "")) }}\' } } };',
		},
		// A plain string is not an expression.
		{ code: "const p = { routing: { request: { url: '/items/list' } } };" },
		// A resource locator's link mode is shown, not requested.
		{
			code: "const p = { modes: [{ name: 'url', type: 'string', url: '=https://example.com/{{$value}}' }] };",
		},

		// A `let` whose every value is encoded.
		{
			code: withImport(`let id = toPathSegment(raw);
const url = \`/posts/\${id}\`;`),
		},

		// Values that never hold workflow input.
		{
			code: "const resource = this.getNodeParameter('resource', 0) as string;\nconst endpoint = `/${resource}/list`;",
		},
		{
			code: "const credentials = await this.getCredentials('acmeApi');\nconst endpoint = `/accounts/${credentials.accountId}/users`;",
		},
		{
			code: "const { oauthTokenData } = await this.getCredentials('acmeOAuth2Api');\nconst endpoint = `/organizers/${oauthTokenData.organizer_key}/webinars`;",
		},
		{
			code: "const webhookData = this.getWorkflowStaticData('node');\nconst endpoint = `/webhooks/${webhookData.webhookId}`;",
		},
		{
			code: "const paths = { karma: 'me/karma', trophies: 'me/trophies' };\nconst endpoint = `/api/v1/${paths[details]}`;",
		},

		{
			code: "const { appId } = await this.getCredentials('acmeDeveloperApi');\nconst endpoint = `/webhooks/v3/${appId}/settings`;",
		},
		// A binding reserved with `{}` before the request still holds the response.
		{
			code: "let responseData = {};\nresponseData = await acmeApiRequest.call(this, 'POST', '/jobs');\nconst endpoint = `/jobs/${responseData.id}`;",
		},

		// An ID the API generated.
		{
			code: "const response = await acmeApiRequest.call(this, 'POST', '/jobs');\nconst endpoint = `/jobs/${response.id}`;",
		},
		{
			code: "const response = await acmeApiRequest.call(this, 'GET', '/teams');\nfor (const team of response.value) { const endpoint = `/teams/${team.id}/channels`; }",
		},
		{
			code: "const teams = await acmeApiRequestAllItems.call(this, 'value', 'GET', '/teams');\nconst endpoints = teams.map((team) => `/teams/${team.id}/channels`);",
		},

		// Data fetched with workflow input is not the input itself.
		{
			code: "const teamId = this.getNodeParameter('teamId', 0) as string;\nconst channels = await fetchAllChannels.call(this, teamId);\nconst endpoints = channels.map((channel) => `/channels/${channel.id}/messages`);",
		},

		// A link in the output or in a list, never requested.
		{
			code: 'results.push({ name: item.title, value: item.id, url: `${baseUrl}/items/${item.id}` });',
		},
		{
			code: 'returnData.push({ json: { ...file, url: `${baseUrl}/v1/files/${file.name}` } });',
		},

		// A path suffix after a constant.
		{
			code: "const API_VERSION = 'v59.0';\nfunction options(endpoint) { return { uri: `${instanceUrl}/services/data/${API_VERSION}${endpoint}` }; }",
		},

		// A `*Path` name that is not a URL path.
		{ code: 'const filePath = `${directory}/${fileName}`;' },
		// A local function that does not receive a URL path.
		{
			code: "import { formatLabel } from './utils';\nformatLabel(`${first}/${last}`);",
		},

		// Encoded after the node's own concatenation and `+=`.
		{
			code: withImport(
				'requestOptions.uri = url + `/databases/${toPathSegment(database)}/layouts`;',
			),
		},
		{ code: withImport("requestOptions.url += '/' + toPathSegment(id);") },

		// The same shapes without workflow input: a prefix the node built, API elements.
		{
			code: withImport(
				'function run(resource, id) { const path = `${resource}/${toPathSegment(id)}`; }',
			),
		},
		{ code: 'const endpoints = teams.map((team) => `/teams/${team.id}/channels`);' },
		{
			code: "import { handleListing } from './GenericFunctions';\nawait handleListing.call(this, 'GET', `/${resource}`);",
		},
		{ code: 'const worksheetUrl = `${workbookRoot}/workbook/worksheets`;' },
		{
			code: 'const p = { routing: { request: { url: \'={{ $parameter.options?.baseURL?.split("/").pop() || "v1" }}/models\' } } };',
		},

		// Declarative routing: a credential base, a fixed parameter, an encoded concatenation.
		{
			code: "const p = { routing: { request: { url: '={{ $credentials.url }}/api/v1/items' } } };",
		},
		{
			code: 'const p = { routing: { request: { url: \'=/{{ $parameter["resource"] }}/list\' } } };',
		},
		{
			code: 'const p = { routing: { request: { url: \'={{ "/api/v1/users/" + toPathSegment($parameter["userId"]) }}\' } } };',
		},
		{
			code: "const p = { routing: { request: { url: '={{ toPathSegment($value) }}/messages' } } };",
		},

		// After fixed text, only workflow input is reported: a path suffix is checked where it is built.
		{ code: 'function run(path) { const url = `/wiki${path}`; }' },
		{ code: "const API_VERSION = 'v10';\nconst url = `/api/${API_VERSION}${endpoint}`;" },
		// A port or a host part is not in the path.
		{
			code: "const port = this.getNodeParameter('port', 0);\nconst url = `${protocol}://${host}:${port}/api`;",
		},
		{
			code: withImport(
				"const accountId = this.getNodeParameter('accountId', i) as string;\nconst endpoint = `/accounts(${toPathSegment(accountId)})`;",
			),
		},
		// A base URL read from a node parameter is not a segment.
		{ code: "const url = `${this.getNodeParameter('baseUrl', 0)}/api/v1/users`;" },
	],

	invalid: [
		{
			code: 'const endpoint = `/teams/${teamId}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'endpoint = `/case/${caseId}/task/${taskId}`;',
			errors: [{ messageId: 'encodePathSegment' }, { messageId: 'encodePathSegment' }],
		},
		// Adjacent segments are each checked.
		{
			code: 'const endpoint = `/data/${baseId}/${table}/records`;',
			errors: [{ messageId: 'encodePathSegment' }, { messageId: 'encodePathSegment' }],
		},
		// `encodeURIComponent` passes `.` and `..` through unchanged.
		{
			code: 'const endpoint = `/items/${encodeURIComponent(id)}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A path-like parameter name is trusted only on a request helper.
		{
			code: 'function getRow(endpoint) { const url = `${baseUrl}/api/v4/${endpoint}`; }',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'export async function execute(path) { const url = `${host}/files/${path}`; }',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A path-like name does not exempt a local binding.
		{
			code: "const endpoint = this.getNodeParameter('table', 0);\nconst url = `${baseUrl}/rest/v1/${endpoint}`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// The helper must come from n8n-workflow.
		{
			code: "import { toPathSegment } from './unsafe';\nconst endpoint = `/users/${toPathSegment(id)}`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'options.uri = `${baseUrl}/api/${id}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "await grafanaApiRequest.call(this, 'GET', `/dashboards/uid/${uid}`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'await databricksApiRequest(this, cred, { url: `${host}/api/2.0/spaces/${spaceId}` });',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'this.helpers.httpRequest({ url: `${base}/o/${name}` });',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// The value is read one hop back and never encoded.
		{
			code: `const tableId = this.getNodeParameter('tableId', 0) as string;
const endpoint = \`/api/database/rows/table/\${tableId}/\`;`,
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// One arm of a conditional is raw.
		{
			code: withImport('const url = `/posts/${by === "slug" ? toPathSegment(a) : b}`;'),
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A `let` is trusted only when every value written to it is.
		{
			code: withImport(`let id = toPathSegment(raw);
id = other;
const url = \`/posts/\${id}\`;`),
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// `encodeURI` keeps the delimiters, so it does not count.
		{
			code: 'const endpoint = `/files/${encodeURI(filePath)}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A same-named local is not the helper.
		{
			code: `function toPathSegment(x) { return x; }
const endpoint = \`/users/\${toPathSegment(id)}\`;`,
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A member access with an approved name proves nothing.
		{
			code: 'const endpoint = `/users/${helpers.toPathSegment(id)}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A helper is accepted only when configured.
		{
			code: `import { toVolumePath } from '../helpers';
const url = \`\${host}/api/2.0/fs/files/\${toVolumePath(filePath)}\`;`,
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A segment after the host is still a segment.
		{
			code: 'const uri = `https://${subdomain}.example.com/users/${id}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// The path part before `?` is still checked.
		{
			code: 'const url = `/functions/${name}/invocations?Qualifier=${qualifier}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// Declarative routing, raw.
		{
			code: "const p = { routing: { request: { url: '=/workflows/{{ $value }}/activate' } } };",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const p = { routing: { request: { url: '=/{{ $parameter.table }}' } } };",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'const p = { routing: { request: { url: \'=/collections/{{$parameter["collectionId"]}}/{{toPathSegment($parameter["rowId"])}}\' } } };',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// The whole interpolation must be the encoder call.
		{
			code: 'const p = { routing: { request: { url: \'=/items/{{ toPathSegment($value) + "/" + $json.x }}\' } } };',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const p = { routing: { request: { url: '=/items/{{ toPathSegment(a)(b) }}' } } };",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'const p = { routing: { request: { url: \'=/items/{{ toPathSegment("(") + b }}\' } } };',
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A path under a name the rule used to miss.
		{
			code: "const owner = this.getNodeParameter('owner', i) as string;\nconst getEndpoint = `/repos/${owner}/contents`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const agentId = this.getNodeParameter('agentId', i) as string;\nconst invokeUrl = `${HOOKS_BASE_URL}/agents/${agentId}`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const workspaceId = this.getNodeParameter('workspaceId', i) as string;\nconst resource = `workspaces/${workspaceId}/users`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const calendarId = this.getNodeParameter('calendarId', i) as string;\nconst x = { resource: `/calendars/${calendarId}/events` };",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A path handed to one of the node's own helpers.
		{
			code: "import { handleListing } from './GenericFunctions';\nconst username = this.getNodeParameter('username', i) as string;\nawait handleListing.call(this, i, `/user/${username}/saved.json`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "async function getVersion(endpoint) {}\nconst caseId = this.getNodeParameter('caseId', i) as string;\nawait getVersion.call(this, `/cases/${caseId}`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// Concatenation and `+=`.
		{
			code: 'requestOptions.uri = url + `/databases/${database}/layouts`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const endpoint = '/users/' + userId;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "requestOptions.url += '/' + id;",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A path returned by a path-named function, or built for each element.
		{
			code: 'function documentsPath(projectId) { return `/${projectId}/documents`; }',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const folderIds = this.getNodeParameter('folderIds', 0) as string[];\nconst endpoints = folderIds.map((id) => `/mailFolders/${id}/messages`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// The first segment of a relative path is not a base URL.
		{
			code: "const phoneNumberId = this.getNodeParameter('phoneNumberId', i) as string;\nconst url = `${phoneNumberId}/messages`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const p = { routing: { request: { url: '={{ $value }}/messages' } } };",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A raw value right after an encoded segment extends it.
		{
			code: withImport('const url = `/items/${toPathSegment(a)}${b}`;'),
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// Declarative concatenation.
		{
			code: 'const p = { routing: { request: { url: \'={{ "/api/v1/users/" + $parameter["userId"] }}\' } } };',
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A path variable is checked where it is built, not where it is used.
		{
			code: "const id = this.getNodeParameter('id', 0) as string;\nconst sheetPath = `${workbookRoot}/worksheets/${id}`;\nawait apiRequest.call(this, 'GET', `${sheetPath}/usedRange`);",
			errors: [{ messageId: 'encodePathSegment', line: 2 }],
		},

		// A relative path handed to one of the node's own helpers.
		{
			code: "import { handleListing } from './GenericFunctions';\nconst username = this.getNodeParameter('username', i) as string;\nawait handleListing.call(this, i, `user/${username}/saved.json`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A value the node already encodes the old way is a segment, whatever its source.
		{
			code: 'function usersPath(mailbox, resource) { const apiUrl = `${baseUrl}/v1.0/users/${encodeURIComponent(mailbox)}${resource}`; }',
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A name from an API response may be chosen by a user of the service.
		{
			code: "const file = await acmeApiRequest.call(this, 'GET', '/files');\nconst endpoint = `/files/${file.name}`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// API responses can be distrusted.
		{
			code: "const response = await acmeApiRequest.call(this, 'POST', '/jobs');\nconst endpoint = `/jobs/${response.id}`;",
			options: [{ trustApiResponses: false }],
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A binding that also holds something other than the response.
		{
			code: "let responseData = await acmeApiRequest.call(this, 'POST', '/jobs');\nresponseData = { id: this.getNodeParameter('id', 0) };\nconst endpoint = `/jobs/${responseData.id}`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// The result of any other local function is not an API response.
		{
			code: 'const params = getParams.call(this, i);\nconst endpoint = `/items/${params.itemId}`;',
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// Only `resource` and `operation` are fixed.
		{
			code: "const table = this.getNodeParameter('table', 0) as string;\nconst endpoint = `/${table}/list`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// Workflow input after fixed text in a segment.
		{
			code: "const id = this.getNodeParameter('id', i) as string;\nconst endpoint = `/users-${id}`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const id = this.getNodeParameter('id', i) as string;\nawait apiRequest.call(this, 'GET', `/api/v1${id}/`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: "const accountId = this.getNodeParameter('accountId', i) as string;\nawait microsoftApiRequest.call(this, 'DELETE', `/accounts(${accountId})`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: withImport(
				"const range = this.getNodeParameter('range', i) as string;\nconst endpoint = `/worksheets/${toPathSegment(id)}/range(address='${range}')`;",
			),
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// A value the node encodes the old way is reported after fixed text too.
		{
			code: "const endpoint = `/range(address='${encodeURIComponent(range)}')`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// Workflow input right after another value in the same segment.
		{
			code: "const suffix = this.getNodeParameter('suffix', i) as string;\nconst file = await acmeApiRequest.call(this, 'GET', '/files');\nconst endpoint = `/files/${file.id}${suffix}`;",
			errors: [{ messageId: 'encodePathSegment', column: 38 }],
		},
		{
			code: "const graphApiVersion = this.getNodeParameter('graphApiVersion', i) as string;\nconst node = this.getNodeParameter('node', i) as string;\nconst uri = `https://${hostUrl}/${graphApiVersion}${node}`;",
			errors: [
				{ messageId: 'encodePathSegment', column: 35 },
				{ messageId: 'encodePathSegment', column: 53 },
			],
		},

		// A node parameter read at the start of a relative path.
		{
			code: "const url = `${this.getNodeParameter('phoneNumberId', i)}/messages`;",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		// An input field at the start of a declarative path.
		{
			code: "const p = { routing: { request: { url: '={{ $json.id }}/messages' } } };",
			errors: [{ messageId: 'encodePathSegment' }],
		},
		{
			code: 'const p = { routing: { request: { url: \'={{ $json["phoneNumberId"] }}/messages\' } } };',
			errors: [{ messageId: 'encodePathSegment' }],
		},

		// A name from an API response handed to one of the node's own helpers.
		{
			code: "import { handleListing } from './GenericFunctions';\nconst { name } = await redditApiRequest.call(this, 'GET', 'api/v1/me');\nawait handleListing.call(this, i, `user/${name}/saved.json`);",
			errors: [{ messageId: 'encodePathSegment' }],
		},
	],
});
