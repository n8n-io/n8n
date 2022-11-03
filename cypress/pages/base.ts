import { IE2ETestPage, IE2ETestPageElement } from "../Interfaces";


export class BasePage implements IE2ETestPage {
	elements: Record<string, IE2ETestPageElement> = {};
	get(id: keyof BasePage['elements'], ...args: unknown[]): ReturnType<IE2ETestPageElement> {
		return this.elements[id](...args);
	}
}
