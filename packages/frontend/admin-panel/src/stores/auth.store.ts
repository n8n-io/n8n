import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface User {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	role: string;
	globalScopes?: string[];
}

export const useAuthStore = defineStore('auth', () => {
	// State
	const user = ref<User | null>(null);
	const initialized = ref(false);

	// Computed
	const isLoggedIn = computed(() => user.value !== null);

	const isAdmin = computed(() => {
		if (!user.value) return false;

		// 检查角色
		const role = user.value.role;
		if (role === 'global:owner' || role === 'global:admin') {
			return true;
		}

		// 检查 global scopes
		if (user.value.globalScopes?.includes('admin')) {
			return true;
		}

		return false;
	});

	const userName = computed(() => {
		if (!user.value) return '';
		if (user.value.firstName && user.value.lastName) {
			return `${user.value.firstName} ${user.value.lastName}`;
		}
		return user.value.email;
	});

	// Actions
	async function checkAuth() {
		try {
			// 调用 n8n 的 /rest/me API 获取当前用户信息
			const response = await fetch('/rest/me', {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Not authenticated');
			}

			user.value = await response.json();
			initialized.value = true;

			return user.value;
		} catch (error) {
			console.error('[Auth] Failed to check authentication:', error);
			user.value = null;
			initialized.value = true;
			throw error;
		}
	}

	async function logout() {
		try {
			await fetch('/rest/logout', {
				method: 'POST',
				credentials: 'include',
			});
		} catch (error) {
			console.error('[Auth] Logout failed:', error);
		} finally {
			user.value = null;
			window.location.href = '/signin';
		}
	}

	function reset() {
		user.value = null;
		initialized.value = false;
	}

	return {
		// State
		user,
		initialized,

		// Computed
		isLoggedIn,
		isAdmin,
		userName,

		// Actions
		checkAuth,
		logout,
		reset,
	};
});
