import { IE2ETestPage, IE2ETestPageElement } from '../types';

export class BasePage implements IE2ETestPage {
	getters: Record<string, IE2ETestPageElement> = {};
	actions: Record<string, (...args: any[]) => void> = {};
}
