import { onTrigger } from '@n8n/sdk';
import http from '@n8n/sdk/http';

onTrigger('jira', {
	events: ['jira:issue_created'],
	credential: 'My Jira Account',
	credentialType: 'jiraSoftwareCloudApi',
}, async () => {
	await http.post('https://slack.com/api/chat.postMessage', {
		channel: '#dev',
		text: 'New Jira issue created',
	});
});
