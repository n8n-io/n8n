import { defineStore } from 'pinia';

export const useTemplatesStore = defineStore('albertsonsTemplates', {
	state: () => ({
		publishedTemplateIds: new Set<string>(
			JSON.parse(localStorage.getItem('albertsons_templates') || '[]'),
		),
	}),

	actions: {
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
