import { createApp } from 'vue';
import type { Router } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { createRouter, createWebHistory } from 'vue-router';
import { ExternalRouterLinksPlugin } from '@/plugins/external-router-links';

const routes = ['home', 'about', 'contact']
	.map((name) => ({
		path: '/' + name,
		component: { template: '<div />' },
	}))
	.concat({
		path: '/workflow/:id',
		component: { template: '<div />' },
	});

describe('Vue Router Link Plugin', () => {
	let router: Router;

	beforeEach(() => {
		router = createRouter({
			history: createWebHistory(),
			routes,
		});

		document.body.innerHTML = '<div id="app" />';
		const app = createApp({
			template: `<div>
				<a id="home" href="/home">Home</a>
				<a href="/about"><strong>About</strong></a>
				<a id="nonExisting" href="/non-existing">Non existing</a>
				<router-link id="routerLink" to="/contact">Contact</router-link>
				<router-link id="workflowRouterLink" to="/workflow/1">Workflow 1</router-link>
			</div>`,
		});

		app.use(router);
		app.use(ExternalRouterLinksPlugin);
		app.mount('#app');
	});

	it('should navigate to the correct route when clicking on an element inside a link', async () => {
		const pushSpy = vi.spyOn(router, 'push');

		const el = document.querySelector('strong') as HTMLElement;
		await userEvent.click(el);

		expect(pushSpy).toHaveBeenCalledWith('/about');
	});

	it('should navigate to the correct route when clicking on the link', async () => {
		const pushSpy = vi.spyOn(router, 'push');

		const link = document.querySelector('#home') as HTMLElement;
		await userEvent.click(link);

		expect(pushSpy).toHaveBeenCalledWith('/home');
	});

	it('should not navigate if the route does not exist', async () => {
		const pushSpy = vi.spyOn(router, 'push');

		const link = document.querySelector('#nonExisting') as HTMLElement;
		await userEvent.click(link);

		expect(pushSpy).not.toHaveBeenCalled();
	});

	it('should not call router push twice', async () => {
		const pushSpy = vi.spyOn(router, 'push');

		const link = document.querySelector('#routerLink') as HTMLElement;
		await userEvent.click(link);

		expect(pushSpy).toHaveBeenCalledTimes(1);
	});

	it('should not match routes with params', async () => {
		const pushSpy = vi.spyOn(router, 'push');

		const link = document.querySelector('#workflowRouterLink') as HTMLElement;
		await userEvent.click(link);

		expect(pushSpy).toHaveBeenCalledTimes(1);
	});
});
