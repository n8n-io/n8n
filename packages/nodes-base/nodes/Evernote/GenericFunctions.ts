import {
	ILoadOptionsFunctions, IExecuteFunctions,
} from 'n8n-core';
const Evernote = require('evernote');

let client: undefined | any = undefined;

export function getClient(this: ILoadOptionsFunctions | IExecuteFunctions): any {
	const credentials = this.getCredentials('evernoteApi');
	if (client === undefined) {
		client = new Evernote.Client({ token: credentials!.apiKey as string});
	}
	return client;
}

export function getNoteType() {
	return new Evernote.Types.Note();
}

export function getNoteFilter() {
	return new Evernote.NoteStore.NoteFilter();
}
export function getNoteResultSpec() {
	return new Evernote.NoteStore.NotesMetadataResultSpec();
}



