import Vue from 'vue';

export const targetBlank = Vue.extend({
	methods: {
		addTargetBlank(html: string) {
			return html.includes('a href')
				? html.replace(/a href/g, 'a target="_blank" href')
				: html;
		},
	},
});
