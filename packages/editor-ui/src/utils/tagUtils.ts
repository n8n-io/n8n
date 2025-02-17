import type { ITag } from '@/Interface';

export function tagMatchesSearch(tag: ITag, search: string): boolean {
	return tag.name.toLowerCase().trim().includes(search.toLowerCase().trim());
}
