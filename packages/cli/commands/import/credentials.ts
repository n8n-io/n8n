import {
	Command, flags,
} from '@oclif/command';

import {
	Db,
	GenericHelpers,
	ICredentialsDb,
} from "../../src";

import { 
	parse,
} from 'flatted';

import { 
	readFileSync,
} from 'fs';

export class ImportCredentialsCommand extends Command {
	static description = 'Import credentials';
	
	static examples = [
		`$ n8n import:credentials --input=file.txt`,
	];
	
	static flags = {
		help: flags.help({ char: 'h' }),
		input: flags.string({
			description: 'Input file name',
		}),
	};
	
	async run() {
		const { flags } = this.parse(ImportCredentialsCommand);
		
		if (!flags.input) {
			GenericHelpers.logOutput(`An input file with --input must be used`);
			return;
		}
		
		try {
			const fileContents = parse(readFileSync(flags.input!, {encoding: 'utf8'})) as ICredentialsDb[];
			
			await Db.init();
			
			for (let i = 0; i < fileContents.length; i++) {
				await Db.collections.Credentials!.save(fileContents[i]);
			}
			
			console.log('Data imported!');
		} catch (e) {
			console.error('\nGOT ERROR');
			console.log('====================================');
			console.error(e.message);
			console.error(e.stack);
			this.exit(1);
		}
		
		this.exit();
	}
}
