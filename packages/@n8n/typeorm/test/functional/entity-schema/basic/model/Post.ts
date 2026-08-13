import { Category } from './Category';

export interface Post {
	id: number;
	title: string;
	text: string;
	categories: Category[];
}
