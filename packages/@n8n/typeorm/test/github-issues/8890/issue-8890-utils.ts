import 'reflect-metadata';
import { EntityManager } from '../../../src';
import { Post } from './entity/Post';
import { Author } from './entity/Author';
import { Profile } from './entity/Profile';
import { User } from './entity/User';

export async function prepareDataManyToOne(manager: EntityManager) {
	const author1 = new Author();
	author1.id = 1;
	author1.firstName = 'Timber';
	author1.lastName = 'Saw';
	author1.age = 25;

	const author2 = new Author();
	author2.id = 2;
	author2.firstName = 'Bob';
	author2.lastName = 'Miller';
	author2.age = 34;

	const author3 = new Author();
	author3.id = 3;
	author3.firstName = 'Max';
	author3.lastName = 'Newton';
	author3.age = 54;

	await manager.save([author1, author2, author3]);

	const post1 = new Post();
	post1.id = 1;
	post1.title = 'Post #1';
	post1.text = 'About post #1';
	post1.author = author1;

	const post2 = new Post();
	post2.id = 2;
	post2.title = 'Post #2';
	post2.text = 'About post #2';

	const post3 = new Post();
	post3.id = 3;
	post3.title = 'Post #3';
	post3.text = 'About post #3';

	const post4 = new Post();
	post4.id = 4;
	post4.title = 'Post #4';
	post4.text = 'About post #4';
	post4.author = author2;

	const post5 = new Post();
	post5.id = 5;
	post5.title = 'Post #5';
	post5.text = 'About post #5';
	post5.author = author3;

	await manager.save([post1, post2, post3, post4, post5]);
}

export async function prepareDataOneToOne(manager: EntityManager) {
	const profile1 = new Profile();
	profile1.id = 1;
	profile1.image = 'image-1.jpg';

	const profile2 = new Profile();
	profile2.id = 2;
	profile2.image = 'image-2.jpg';

	const profile3 = new Profile();
	profile3.id = 3;
	profile3.image = 'image-3.jpg';

	await manager.save([profile1, profile2, profile3]);

	const user1 = new User();
	user1.id = 1;
	user1.username = 'user #1';
	user1.profile = profile1;

	const user2 = new User();
	user2.id = 2;
	user2.username = 'user #2';
	user2.profile = profile2;

	const user3 = new User();
	user3.id = 3;
	user3.username = 'user #3';
	user3.profile = profile3;

	const user4 = new User();
	user4.id = 4;
	user4.username = 'user #4';

	await manager.save([user1, user2, user3, user4]);
}
