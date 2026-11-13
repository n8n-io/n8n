import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('ActiveCampaign > Workflows', () => {
	const credentials = {
		activeCampaignApi: {
			apiUrl: 'https://n8n-test.api-us1.com',
			apiKey: 'test-api-key',
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			nock('https://n8n-test.api-us1.com')
				.post('/api/3/contacts')
				.reply(200, {
					contact: { requestPath: '/api/3/contacts', resource: 'contact', operation: 'create' },
				})
				.get('/api/3/contacts?limit=2')
				.reply(200, {
					contacts: [{ requestPath: '/api/3/contacts', resource: 'contact', operation: 'getAll' }],
					meta: { total: '1' },
				})
				.get('/api/3/contacts/101')
				.reply(200, { requestPath: '/api/3/contacts/101', resource: 'contact', operation: 'get' })
				.put('/api/3/contacts/101')
				.reply(200, {
					contact: { requestPath: '/api/3/contacts/101', resource: 'contact', operation: 'update' },
				})
				.delete('/api/3/contacts/101')
				.reply(200, {
					requestPath: '/api/3/contacts/101',
					resource: 'contact',
					operation: 'delete',
				})
				.get('/api/3/accounts/202')
				.reply(200, { requestPath: '/api/3/accounts/202', resource: 'account', operation: 'get' })
				.put('/api/3/accounts/202')
				.reply(200, {
					account: { requestPath: '/api/3/accounts/202', resource: 'account', operation: 'update' },
				})
				.delete('/api/3/accounts/202')
				.reply(200, {
					requestPath: '/api/3/accounts/202',
					resource: 'account',
					operation: 'delete',
				})
				.put('/api/3/accountContacts/303')
				.reply(200, {
					accountContact: {
						requestPath: '/api/3/accountContacts/303',
						resource: 'accountContact',
						operation: 'update',
					},
				})
				.delete('/api/3/accountContacts/303')
				.reply(200, {
					requestPath: '/api/3/accountContacts/303',
					resource: 'accountContact',
					operation: 'delete',
				})
				.delete('/api/3/contactTags/404')
				.reply(200, {
					requestPath: '/api/3/contactTags/404',
					resource: 'contactTag',
					operation: 'remove',
				})
				.get('/api/3/tags?limit=100&offset=0')
				.reply(200, {
					tags: [{ requestPath: '/api/3/tags', resource: 'tag', operation: 'getAll' }],
					meta: { total: '1' },
				})
				.get('/api/3/tags/505')
				.reply(200, { requestPath: '/api/3/tags/505', resource: 'tag', operation: 'get' })
				.put('/api/3/tags/505')
				.reply(200, {
					tag: { requestPath: '/api/3/tags/505', resource: 'tag', operation: 'update' },
				})
				.delete('/api/3/tags/505')
				.reply(200, { requestPath: '/api/3/tags/505', resource: 'tag', operation: 'delete' })
				.get('/api/3/deals/606')
				.reply(200, { requestPath: '/api/3/deals/606', resource: 'deal', operation: 'get' })
				.put('/api/3/deals/606')
				.reply(200, { requestPath: '/api/3/deals/606', resource: 'deal', operation: 'update' })
				.delete('/api/3/deals/606')
				.reply(200, { requestPath: '/api/3/deals/606', resource: 'deal', operation: 'delete' })
				.post('/api/3/deals/606/notes')
				.reply(200, {
					requestPath: '/api/3/deals/606/notes',
					resource: 'deal',
					operation: 'createNote',
				})
				.put('/api/3/deals/606/notes/707')
				.reply(200, {
					requestPath: '/api/3/deals/606/notes/707',
					resource: 'deal',
					operation: 'updateNote',
				})
				.get('/api/3/connections/808')
				.reply(200, {
					requestPath: '/api/3/connections/808',
					resource: 'connection',
					operation: 'get',
				})
				.put('/api/3/connections/808')
				.reply(200, {
					requestPath: '/api/3/connections/808',
					resource: 'connection',
					operation: 'update',
				})
				.delete('/api/3/connections/808')
				.reply(200, {
					requestPath: '/api/3/connections/808',
					resource: 'connection',
					operation: 'delete',
				})
				.get('/api/3/ecomOrders/909')
				.reply(200, {
					requestPath: '/api/3/ecomOrders/909',
					resource: 'ecommerceOrder',
					operation: 'get',
				})
				.put('/api/3/ecomOrders/909')
				.reply(200, {
					requestPath: '/api/3/ecomOrders/909',
					resource: 'ecommerceOrder',
					operation: 'update',
				})
				.delete('/api/3/ecomOrders/909')
				.reply(200, {
					requestPath: '/api/3/ecomOrders/909',
					resource: 'ecommerceOrder',
					operation: 'delete',
				})
				.get('/api/3/ecomCustomers/1001')
				.reply(200, {
					requestPath: '/api/3/ecomCustomers/1001',
					resource: 'ecommerceCustomer',
					operation: 'get',
				})
				.put('/api/3/ecomCustomers/1001')
				.reply(200, {
					requestPath: '/api/3/ecomCustomers/1001',
					resource: 'ecommerceCustomer',
					operation: 'update',
				})
				.delete('/api/3/ecomCustomers/1001')
				.reply(200, {
					requestPath: '/api/3/ecomCustomers/1001',
					resource: 'ecommerceCustomer',
					operation: 'delete',
				})
				.get('/api/3/ecomOrderProducts/1102')
				.reply(200, {
					requestPath: '/api/3/ecomOrderProducts/1102',
					resource: 'ecommerceOrderProducts',
					operation: 'getByProductId',
				})
				.get('/api/3/ecomOrders/909/orderProducts')
				.reply(200, {
					requestPath: '/api/3/ecomOrders/909/orderProducts',
					resource: 'ecommerceOrderProducts',
					operation: 'getByOrderId',
				});
		});

		new NodeTestHarness().setupTests({ credentials, workflowFiles: ['workflow.json'] });
	});
});
