import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	noteOpeations,
	noteFields
} from './EvernoteDescription';
import {
	getClient,
	getNoteType,
	getNoteFilter,
	getNoteResultSpec,
} from './GenericFunctions';

export class Evernote implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evernote',
		name: 'Evernote',
		icon: 'file:evernote.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Evenote API',
		defaults: {
			name: 'Evernote',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'evernoteApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Note',
						value: 'note',
						description: ``,
					},
				],
				default: 'note',
				description: 'Resource to consume.',
			},
			...noteOpeations,
			...noteFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available notebooks to display them to user so that he can
			// select them easily
			async getNotebooks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let notebooks;
				const client = getClient.call(this);
				const noteStore = client.getNoteStore();
				try {
					notebooks = await noteStore.listNotebooks();
				} catch (err) {
					throw new Error(`Evernote Error: ${err}`);
				}
				for (const notebook of notebooks) {
					const notebookName = notebook.name;
					const notebookId = notebook.guid;
					returnData.push({
						name: notebookName,
						value: notebookId,
					});
				}
				return returnData;
			},

			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let tags;
				const client = getClient.call(this);
				const noteStore = client.getNoteStore();
				try {
					tags = await noteStore.listTags();
				} catch (err) {
					throw new Error(`Evernote Error: ${err}`);
				}
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = tag.guid;
					returnData.push({
						name: tagName,
						value: tagId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const client = getClient.call(this);
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'note') {
				//http://dev.evernote.com/doc/reference/NoteStore.html#Fn_NoteStore_createNote
				if (operation === 'create') {
					const note = getNoteType();
					const noteStore = client.getNoteStore();
					const notebook = this.getNodeParameter('notebookGuid', i) as string;
					const title = this.getNodeParameter('title', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const xmlParameters = this.getNodeParameter('xmlParameters', i) as boolean;
					if (xmlParameters) {
						const content = this.getNodeParameter('contentXML', i) as string;
						note.content = content;
					} else {
						const content = this.getNodeParameter('content', i) as string;
						note.content = `<?xml version="1.0" encoding="UTF-8"?>
						<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
						<en-note>${content}</en-note>`;
					}
					if (options.tagGuids) {
						note.tagGuids = options.tagGuids as string;
					}
					note.title = title;
					note.notebookGuid = notebook;
					try {
						responseData = await noteStore.createNote(note);
					} catch (err) {
						throw new Error(`Evernote Error: ${JSON.stringify(err)}`);
					}
					delete responseData.contentHash;
				}
				//http://dev.evernote.com/doc/reference/NoteStore.html#Fn_NoteStore_findNotesMetadata
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const noteStore = client.getNoteStore();
					const filter = getNoteFilter();
					const resultSpect = getNoteResultSpec();
					for (const key of Object.keys(options)) {
						resultSpect[key] = options[key];
					}
					for (const key of Object.keys(filters)) {
						filter[key] = filters[key];
					}
					let limit = 250;
					let index = 0;
					try {
						if (returnAll === true) {
							do {
								responseData = await noteStore.findNotesMetadata(filter, index, limit, resultSpect);
								returnData.push.apply(returnData, responseData['notes']);
								index = responseData.startIndex + limit;
							} while (responseData.startIndex < responseData.totalNotes);
							responseData = returnData;
						} else {
							limit = this.getNodeParameter('limit', 0) as number;
							responseData = await noteStore.findNotesMetadata(filter, index, limit, resultSpect);
							responseData = responseData.notes;
						}
					} catch (err) {
						throw new Error(`Evernote Error: ${JSON.stringify(err)}`);
					}
				}
				//http://dev.evernote.com/doc/reference/NoteStore.html#Fn_NoteStore_getNote
				if (operation === 'get') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					const noteId = this.getNodeParameter('noteGUID', i) as string;
					const noteStore = client.getNoteStore();
					try {
						responseData = await noteStore.getNote(
							noteId,
							options.withContent || false,
							options.withResourcesData || false,
							options.withResourcesRecognition || false,
							options.withResourcesAlternateData || false
						);
						delete responseData.contentHash;
					} catch (err) {
						throw new Error(`Evernote Error: ${JSON.stringify(err)}`);
					}
				}
				//http://dev.evernote.com/doc/reference/NoteStore.html#Fn_NoteStore_deleteNote
				if (operation === 'delete') {
					const noteId = this.getNodeParameter('noteGUID', i) as string;
					const noteStore = client.getNoteStore();
					try {
						responseData = await noteStore.deleteNote(noteId);
					} catch (err) {
						throw new Error(`Evernote Error: ${JSON.stringify(err)}`);
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
