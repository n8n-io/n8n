import { gmailGet, gmailGetMany, gmailSend } from './gmail';
import { geminiMessage } from './google-gemini';
import { sheetsAppend, sheetsAppendOrUpdate, sheetsRead } from './google-sheets';
import { httpRequest } from './http-request';
import { ifCondition } from './if';
import { notionGetManyPages, notionGetPage } from './notion';
import { setFields } from './set';
import type { ActionContract } from '../types';

export const CONTRACTS: readonly ActionContract[] = [
	setFields,
	ifCondition,
	gmailGetMany,
	gmailGet,
	gmailSend,
	notionGetManyPages,
	notionGetPage,
	httpRequest,
	geminiMessage,
	sheetsAppend,
	sheetsAppendOrUpdate,
	sheetsRead,
];

const BY_ID = new Map(CONTRACTS.map((contract) => [contract.id, contract]));

export function getContract(id: string): ActionContract | undefined {
	return BY_ID.get(id);
}
