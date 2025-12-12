import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useUserSessionStore = defineStore('userSession', () => {
	const user = ref(null);
	const isLoaded = ref(false);

	async function loadUser() {
		try {
			// IMPORTANT: Must call n8n backend port 5678
			const res = await fetch('http://localhost:5678/rest/me', {
				credentials: 'include',
			});

			if (!res.ok) {
				console.error('Failed to load /rest/me');
				return;
			}

			const data = await res.json();
			user.value = data;
			isLoaded.value = true;

			console.log('User stored in userSession:', data);
		} catch (err) {
			console.error('Error loading user session:', err);
		}
	}

	return { user, isLoaded, loadUser };
});
