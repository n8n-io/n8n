<script setup lang="ts"></script>

<template>
	<div :class="$style.n8nTable">
		<div :class="$style.n8nTableScroll">
			<table>
				<slot />
			</table>
		</div>
	</div>
</template>

<style lang="scss" module>
.n8nTableScroll {
	max-height: 100%;
	overflow: auto;
	position: relative;
}
.n8nTable {
	height: 100%;
	border-radius: 8px;
	border: 1px solid var(--color-foreground-base);
	overflow: hidden;
	font-size: var(--font-size-s);

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		white-space: nowrap;

		> thead {
			position: sticky;
			top: 0;
			z-index: 2;
		}
	}

	th,
	td {
		text-align: left;
	}

	th {
		background-color: var(--color-background-light-base);
		color: var(--color-text-base);
		font-weight: 600;
		font-size: 12px;
		padding: 0 8px;
		text-transform: capitalize;
		height: 36px;
		white-space: nowrap;
		border-bottom: 1px solid var(--color-foreground-base);

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}
	}

	tbody > tr {
		&:hover {
			background-color: var(--color-background-light);
		}

		&:last-child > td {
			border-bottom: 0;
		}
	}

	tr {
		background-color: var(--color-background-xlight);
	}

	td {
		color: var(--color-text-dark);
		padding: 0 8px;
		height: 48px;

		border-bottom: 1px solid var(--color-foreground-base);

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}
	}
}
</style>
