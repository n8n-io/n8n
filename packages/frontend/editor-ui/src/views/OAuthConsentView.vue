<script setup lang="ts">
import { useConsentStore } from '@/stores/consent.store';
import { ref, onMounted } from 'vue';

// Reactive state
const error = ref<string | null>(null);

const consentStore = useConsentStore();

// Hardcoded permissions
const permissions = [
	{
		id: 'workflows',
		title: 'Access your n8n workflows',
		description: 'View, create, and modify workflows in your n8n instance',
	},
	{
		id: 'credentials',
		title: 'Manage workflow credentials',
		description: 'Access and use credentials configured in your workflows',
	},
	{
		id: 'execute',
		title: 'Execute workflows and nodes',
		description: 'Run workflows and see their execution results',
	},
	{
		id: 'tools',
		title: 'Use n8n as an AI tool',
		description: 'Allow the AI to interact with your n8n instance to perform automations',
	},
];

const handleAllow = async () => {
	try {
		const response = await consentStore.approveConsent(true);
		window.location.href = response.redirectUrl;
	} catch (err) {
		// Error is already set in the store
		console.error('Failed to approve consent', err);
	}
};

const handleDeny = async () => {
	try {
		const response = await consentStore.approveConsent(false);
		window.location.href = response.redirectUrl;
	} catch (err) {
		console.error('Failed to deny consent', err);
	}
};

// Lifecycle
onMounted(async () => {
	await consentStore.fetchConsentDetails();
});
</script>

<template>
	<!-- Same template as before -->
	<div class="consent-container">
		<!-- Logo Section -->
		<div class="logo-section">
			<div class="logo-box n8n-logo">n8n</div>
			<div class="arrow">→</div>
			<div class="logo-box mcp-logo">🔌</div>
		</div>

		<!-- Title -->
		<div class="title-section">
			<h1>
				<span class="client-name">{{ consentStore.consentDetails.clientName }}</span> wants to
				access your n8n MCP Server
			</h1>
		</div>

		<!-- Error Message -->
		<div v-if="error" class="error-message">
			{{ consentStore.error }}
		</div>

		<!-- Description -->
		<p class="description">
			This will allow <strong>{{ consentStore.consentDetails.clientName }}</strong> to access the
			following resources and capabilities:
		</p>

		<!-- Permissions List -->
		<div class="permissions-section">
			<div v-for="permission in permissions" :key="permission.id" class="permission-item">
				<input type="checkbox" class="permission-checkbox" checked disabled />
				<div class="permission-content">
					<div class="permission-title">{{ permission.title }}</div>
					<div class="permission-desc">{{ permission.description }}</div>
				</div>
			</div>
		</div>

		<!-- Warning Box -->
		<div class="warning-box">
			<p>
				<span class="warning-icon">⚠️</span>
				<strong>Important:</strong> Make sure you trust
				{{ consentStore.consentDetails.clientName }}. You may be sharing sensitive workflow data and
				automation capabilities with this application.
			</p>
		</div>

		<!-- Legal Text -->
		<p class="legal-text">
			The {{ consentStore.consentDetails.clientName }} <a href="#">terms of service</a> and
			<a href="#">privacy policy</a> that you agreed to with them govern their use of your data.
		</p>

		<!-- Buttons -->
		<div class="button-container">
			<button
				@click="handleDeny"
				:disabled="consentStore.isLoading || !!consentStore.error"
				class="btn btn-deny"
			>
				Deny
			</button>
			<button
				@click="handleAllow"
				:disabled="consentStore.isLoading || !!consentStore.error"
				class="btn btn-allow"
			>
				<span v-if="consentStore.isLoading" class="loading-spinner"></span>
				{{ consentStore.isLoading ? 'Authorizing...' : 'Allow' }}
			</button>
		</div>
	</div>
</template>

<style scoped>
/* Same styles as before */
.consent-container {
	background: white;
	border-radius: 8px;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
	max-width: 520px;
	width: 90%;
	padding: 32px;
	margin: 0 auto;
}

.logo-section {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	margin-bottom: 28px;
}

.logo-box {
	width: 56px;
	height: 56px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24px;
	font-weight: bold;
}

.n8n-logo {
	background: #ea4b71;
	color: white;
}

.mcp-logo {
	background: #e8e8e8;
	font-size: 28px;
}

.arrow {
	color: #999;
	font-size: 18px;
}

.title-section {
	text-align: center;
	margin-bottom: 24px;
}

.title-section h1 {
	font-size: 22px;
	font-weight: 600;
	color: #2a2a2a;
	line-height: 1.3;
}

.client-name {
	color: #ea4b71;
}

.description {
	color: #666;
	font-size: 14px;
	line-height: 1.5;
	margin-bottom: 24px;
}

.permissions-section {
	margin-bottom: 24px;
}

.permission-item {
	display: flex;
	align-items: flex-start;
	margin-bottom: 16px;
	gap: 12px;
}

.permission-checkbox {
	width: 20px;
	height: 20px;
	min-width: 20px;
	margin-top: 2px;
	accent-color: #ea4b71;
	pointer-events: none;
}

.permission-content {
	flex: 1;
}

.permission-title {
	font-weight: 600;
	color: #2a2a2a;
	margin-bottom: 2px;
	font-size: 14px;
}

.permission-desc {
	color: #666;
	font-size: 13px;
	line-height: 1.4;
}

.warning-box {
	background: #fffbf0;
	border-left: 3px solid #f0b429;
	padding: 12px;
	margin-bottom: 24px;
	border-radius: 4px;
}

.warning-box p {
	color: #975a16;
	font-size: 13px;
	line-height: 1.5;
}

.warning-box strong {
	color: #744210;
}

.warning-icon {
	color: #f0b429;
	margin-right: 8px;
}

.legal-text {
	text-align: center;
	color: #666;
	font-size: 12px;
	line-height: 1.5;
	margin-bottom: 24px;
}

.legal-text a {
	color: #ea4b71;
	text-decoration: none;
}

.legal-text a:hover {
	text-decoration: underline;
}

.button-container {
	display: flex;
	gap: 16px;
	justify-content: center;
}

.btn {
	padding: 12px 32px;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
	min-width: 110px;
}

.btn-deny {
	background: white;
	color: #666;
	border: 2px solid #ddd;
}

.btn-deny:hover {
	background: #f5f5f5;
	border-color: #bbb;
}

.btn-allow {
	background: #ea4b71;
	color: white;
}

.btn-allow:hover {
	background: #d63861;
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(234, 75, 113, 0.3);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn:disabled:hover {
	transform: none;
	box-shadow: none;
}

.loading-spinner {
	display: inline-block;
	width: 14px;
	height: 14px;
	border: 2px solid #ffffff;
	border-radius: 50%;
	border-top-color: transparent;
	animation: spin 0.8s linear infinite;
	margin-right: 8px;
}

.error-message {
	background: #fee;
	border-left: 3px solid #f44;
	color: #c00;
	padding: 12px;
	margin-bottom: 20px;
	border-radius: 4px;
	font-size: 14px;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
