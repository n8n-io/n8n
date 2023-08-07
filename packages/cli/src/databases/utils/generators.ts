import { customAlphabet } from 'nanoid';
import * as os from 'os';
import type { N8nInstanceType } from '@/Interfaces';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

export function generateNanoId() {
	return nanoid();
}

export function generateHostInstanceId(instanceType: N8nInstanceType) {
	return `${os.hostname()}-${instanceType}-${nanoid()}`;
}
