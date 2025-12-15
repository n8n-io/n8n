import { defineStore } from 'pinia';
import { albertsonsRestApiRequest } from '@src/utils/albertsonsRestApiRequest';

export const useTemplatesStore = defineStore('albertsonsTemplates', {
	state: () => ({
		templates: [] as Array<any>,
		publishedTemplateIds: new Set<string>(
			JSON.parse(localStorage.getItem('albertsons_templates') || '[]'),
		),
	}),

	actions: {
		async fetchTemplates() {
			const result = await albertsonsRestApiRequest('GET', `/v1/templates/all`);
			if (result) {
				this.templates = result;
			}
		},
		getTemplates() {
			return this.templates;
		},
		publishAsTemplate(id: string) {
			this.publishedTemplateIds.add(id);
			this.saveToLocalStorage();
		},

		isTemplate(id: string): boolean {
			return this.publishedTemplateIds.has(id);
		},

		getTemplateIds(): string[] {
			return Array.from(this.publishedTemplateIds);
		},

		saveToLocalStorage() {
			localStorage.setItem(
				'albertsons_templates',
				JSON.stringify(Array.from(this.publishedTemplateIds)),
			);
		},

		loadFromLocalStorage() {
			const saved = localStorage.getItem('albertsons_templates');
			if (saved) {
				this.publishedTemplateIds = new Set(JSON.parse(saved));
			}
		},
	},
});
