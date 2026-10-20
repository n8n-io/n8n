/** A pick from the transfer target picker: the project id and whether it is a person or a team project. */
export type ScimTransferPick = {
	projectId: string;
	type: 'person' | 'project';
};
