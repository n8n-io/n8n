<template>
	<div class="templates-page">
		<!-- Page header -->
		<header class="header">
			<h1 class="title">Workflow Templates</h1>
			<p class="subtitle">Published workflow templates available to everyone.</p>
		</header>

		<!-- Templates grid -->
		<section class="grid">
			<article v-for="template in templates" :key="template.id" class="card">
				<div class="card-icon">
					<span class="icon-square" />
				</div>

				<div class="card-body">
					<h2 class="card-title">{{ template.name }}</h2>
					<p class="card-description">
						{{ template.description }}
					</p>
					<p class="card-meta">Published {{ template.publishedAgo }}</p>
				</div>

				<div class="card-footer">
					<button type="button" class="btn-primary">Use Template</button>
				</div>
			</article>
		</section>
	</div>
</template>

<script setup lang="ts">
const templates = [
	{
		id: 1,
		name: 'New Workflow12324',
		description: 'No description',
		publishedAgo: 'about 1 hour ago',
	},
	{
		id: 2,
		name: 'New Workflow 13',
		description: 'No description',
		publishedAgo: '8 days ago',
	},
	{
		id: 3,
		name: 'New Workflow12345678',
		description: 'No description',
		publishedAgo: '8 days ago',
	},
	{
		id: 4,
		name: 'Sash',
		description: 'No description',
		publishedAgo: '11 days ago',
	},
	{
		id: 5,
		name: 'Sash',
		description: 'No description',
		publishedAgo: '11 days ago',
	},
	{
		id: 6,
		name: 'My workflow 222',
		description: 'No description',
		publishedAgo: '11 days ago',
	},
];
</script>

<style scoped>
.templates-page {
	padding: 32px 40px;
	max-width: 1120px;
	margin: 0 auto;
}

/* header */
.header {
	margin-bottom: 24px;
}

.title {
	font-size: 26px;
	font-weight: 600;
	color: #111827;
	margin-bottom: 4px;
}

.subtitle {
	font-size: 14px;
	color: #6b7280;
}

/* grid */
.grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 20px 24px;
}

/* card */
.card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 20px 20px 16px;
	border-radius: 12px;
	border: 1px solid #e5e7eb;
	background-color: #ffffff;
	box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.card-icon {
	margin-bottom: 12px;
}

.icon-square {
	display: inline-block;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: #e5f0ff;
	position: relative;
}

.icon-square::before,
.icon-square::after {
	content: '';
	position: absolute;
	width: 12px;
	height: 12px;
	border-radius: 4px;
	border: 2px solid #2563eb;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.icon-square::after {
	transform: translate(-10px, -50%);
}

/* content */
.card-body {
	margin-bottom: 16px;
}

.card-title {
	font-size: 15px;
	font-weight: 600;
	color: #111827;
	margin-bottom: 2px;
}

.card-description {
	font-size: 13px;
	color: #6b7280;
	margin-bottom: 4px;
}

.card-meta {
	font-size: 11px;
	color: #9ca3af;
}

/* footer */
.card-footer {
	display: flex;
	justify-content: flex-start;
}

.btn-primary {
	padding: 8px 18px;
	border-radius: 999px;
	border: none;
	background-color: #0060dc;
	color: #ffffff;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
}

.btn-primary:hover {
	background-color: #0053bf;
}

/* responsive */
@media (max-width: 1100px) {
	.grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 800px) {
	.templates-page {
		padding: 24px 20px;
	}

	.grid {
		grid-template-columns: 1fr;
	}
}
</style>
