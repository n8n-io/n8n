import { Command, type ICommand } from '@n8n/decorators';

@Command({
	name: 'insights:test',
	description: 'No-op command for insights',
})
export class InsightsCommand implements ICommand {
	async run() {
		console.log('this does nothing');
	}
}
