<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCssVar } from '@vueuse/core';
import type { LocationPoint } from '../dataProfiling.types';

const props = defineProps<{
	points: LocationPoint[];
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const colorPrimary = useCssVar('--color--primary', document.body);

let map: L.Map | undefined;
let markersLayer: L.LayerGroup | undefined;

function fitToPoints() {
	if (!map || props.points.length === 0) {
		return;
	}
	if (props.points.length === 1) {
		map.setView([props.points[0].lat, props.points[0].lon], 10);
		return;
	}
	const bounds = L.latLngBounds(
		props.points.map((point): [number, number] => [point.lat, point.lon]),
	);
	map.fitBounds(bounds, { padding: [24, 24] });
}

function renderPoints() {
	if (!map || !markersLayer) {
		return;
	}
	markersLayer.clearLayers();
	for (const point of props.points) {
		L.circleMarker([point.lat, point.lon], {
			radius: 5,
			color: colorPrimary.value,
			fillColor: colorPrimary.value,
			fillOpacity: 0.7,
			weight: 1,
		}).addTo(markersLayer);
	}
	fitToPoints();
}

onMounted(() => {
	if (!mapContainer.value) {
		return;
	}
	map = L.map(mapContainer.value);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
		maxZoom: 19,
	}).addTo(map);
	markersLayer = L.layerGroup().addTo(map);
	renderPoints();
});

watch(() => props.points, renderPoints);

onBeforeUnmount(() => {
	map?.remove();
});
</script>

<template>
	<div ref="mapContainer" :class="$style.map" data-test-id="profile-location-map" />
</template>

<style lang="scss" module>
.map {
	height: 260px;
	border-radius: var(--radius--2xs);
	overflow: hidden;
}
</style>
