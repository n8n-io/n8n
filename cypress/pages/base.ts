import { IE2ETestPage, IE2ETestPageElement } from "../types";


export class BasePage implements IE2ETestPage {
	elements: Record<string, IE2ETestPageElement> = {};
	get(id: keyof BasePage['elements'], ...args: unknown[]): ReturnType<IE2ETestPageElement> {
		const getter = this.elements[id];

		if (!getter) {
			throw new Error(`No element with id "${id}" found. Check your page object definition.`);
		}

		return getter(...args);
	}
}
