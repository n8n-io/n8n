import { customAlphabet } from 'nanoid';
import type { N8nInstanceType } from '@/Interfaces';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

export function generateNanoId() {
	return nanoid();
}

export function generateHostInstanceId(instanceType: N8nInstanceType) {
	return `${instanceType}-${nanoid()}`;
}
