export function addAutoLoginToAdminPanelButton() {
	const adminPanelHost = new URL(window.location.href).host.split('.').slice(1).join('.');

	document.body?.addEventListener('click', async (e) => {
		if (!e.target || !(e.target instanceof Element)) return;
		if (e.target.getAttribute('id') !== 'admin' && !e.target.closest('#admin')) return;

		e.preventDefault();

		const restPath = window.REST_ENDPOINT ?? 'rest';
		const response = await fetch(`/${restPath}/cloud/proxy/login/code`);
		const { code } = await response.json();
		window.location.href = `https://${adminPanelHost}/login?code=${code}`;
	});
}
