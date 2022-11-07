import { UserSettings } from 'n8n-core';
import { join, parse } from 'node:path';
import { MessageEventSubscriptionReceiver } from './MessageEventSubscriptionReceiver';

// ---------------------------------------
// * This part runs in the Main Thread ! *
// ---------------------------------------

export class FileEventSubscriptionReceiver extends MessageEventSubscriptionReceiver {
	logFileName;

	constructor(props?: { name?: string; fileName?: string }) {
		super({
			name: props?.name ?? 'FileEventSubscriptionReceiver',
			workerFile: `../MessageEventSubscriptionReceiver/${parse(__filename).name}Worker`,
		});
		if (props?.fileName) {
			if (!parse(props.fileName).dir) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				this.logFileName = join(UserSettings.getUserN8nFolderPath(), props.fileName);
			} else {
				this.logFileName = props.fileName;
			}
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			this.logFileName = join(UserSettings.getUserN8nFolderPath(), 'event_log.txt');
		}
	}

	override async launchThread() {
		this.worker = await super.launchThread();
		await this.worker?.communicate('setFileName', this.logFileName);
		await this.worker?.communicate('start', undefined);
		return this.worker;
	}
}
