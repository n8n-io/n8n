import axios from 'axios';
import { useRootStore } from '@/stores/root.store';

export async function fetchTypedefsIndex() {
	const response = await axios.get<string[]>(useRootStore().baseUrl + 'typedefs/keys.json');

	return response.data;
}

export async function fetchTypedefsMap() {
	const response = await axios.get<Record<string, string>>(
		useRootStore().baseUrl + 'typedefs/map.json',
	);

	return response.data;
}
