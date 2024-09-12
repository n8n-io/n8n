import { ALPHABET } from 'n8n-workflow';
import { customAlphabet } from 'nanoid';

import type { N8nInstanceType } from '@/interfaces';

const nanoid = customAlphabet(ALPHABET, 16);

export function generateNanoId() {
	return nanoid();
}

export function generateHostInstanceId(instanceType: N8nInstanceType) {
	return `${instanceType}-${nanoid()}`;
}
