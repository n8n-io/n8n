import { BasePage } from './base';

const MOCK_WORKFLOW = {"id":1751,"name":"Preparing data to be sent to a service","workflow":{"nodes":[{"name":"On clicking 'execute'","type":"n8n-nodes-base.manualTrigger","position":[1160,480],"parameters":{},"typeVersion":1},{"name":"Note","type":"n8n-nodes-base.stickyNote","position":[800,420],"parameters":{"width":320,"height":200,"content":"### Very often your data is not in the right format to insert in a node. you can use the set node to fix it.\n\n### Click the `Execute Workflow` button and double click on the nodes to see the input and output items."},"typeVersion":1},{"name":"Create or Update record in Google Sheet","type":"n8n-nodes-base.googleSheets","position":[1920,480],"parameters":{"range":"A:C","options":{},"sheetId":"13_bAEYNTzVXVY6SfAkBa9ijtJGSxPd8D-hcXXwXtdDo","operation":"upsert","authentication":"oAuth2"},"credentials":{"googleSheetsOAuth2Api":{"id":"8","name":"Sheets"}},"typeVersion":1},{"name":"Note1","type":"n8n-nodes-base.stickyNote","position":[1480,360],"parameters":{"width":400,"height":280,"content":"\nThis is where we put the data in the format that Google Sheets expect. \nThis means changing the field name from `name` to `Full name`, dropping all fields except `ID`, `Email` and adding a `Created time` field"},"typeVersion":1},{"name":"Set - Prepare fields","type":"n8n-nodes-base.set","notes":"Prepare fields","position":[1620,480],"parameters":{"values":{"number":[{"name":"ID","value":"={{$json[\"id\"]}}"}],"string":[{"name":"Full name","value":"={{$json[\"name\"]}}"},{"name":"Email","value":"={{$json[\"email\"]}}"},{"name":"Created time","value":"={{$now}}"}]},"options":{},"keepOnlySet":true},"notesInFlow":false,"typeVersion":1},{"name":"Customer Datastore - Generate some data","type":"n8n-nodes-base.n8nTrainingCustomerDatastore","position":[1340,480],"parameters":{"operation":"getAllPeople"},"typeVersion":1}],"connections":{"Set - Prepare fields":{"main":[[{"node":"Create or Update record in Google Sheet","type":"main","index":0}]]},"On clicking 'execute'":{"main":[[{"node":"Customer Datastore - Generate some data","type":"main","index":0}]]},"Customer Datastore - Generate some data":{"main":[[{"node":"Set - Prepare fields","type":"main","index":0}]]}}}};

export class TemplatesPage extends BasePage {
	url = '/templates';

	getters = {
	};

	actions = {
		openOnboardingFlow: () => {
			const templateId = 1234;
			cy.intercept('POST', '/rest/workflows').as('createWorkflow');
			cy.intercept('GET', `https://api.n8n.io/api/workflows/templates/${templateId}`, {
				statusCode: 200,
				body: MOCK_WORKFLOW,
			}).as('getTemplate');
			cy.intercept('GET', 'rest/workflows/**').as('getWorkflow');

			cy.visit(`/workflows/onboarding/${templateId}`);

			cy.wait('@getTemplate');
			cy.wait(['@createWorkflow', '@getWorkflow']);

			cy.url().then(($url) => {
				expect($url).to.match(/.*\/workflow\/.*?onboardingId=1234$/);
			})
		},

		openTemplateImportFlow: () => {
			const templateId = 1234;
			cy.intercept('GET', `https://api.n8n.io/api/workflows/templates/${templateId}`, {
				statusCode: 200,
				body: MOCK_WORKFLOW,
			}).as('getTemplate');
			cy.intercept('GET', 'rest/workflows/**').as('getWorkflow');

			cy.visit(`/workflows/templates/${templateId}`);

			cy.wait('@getTemplate');
			cy.wait( '@getWorkflow');

			cy.url().then(($url) => {
				expect($url).to.include('/workflow/new?templateId=1234');
			})
		}
	}
}

