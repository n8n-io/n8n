import 'reflect-metadata';
import { EntityManager } from '../../../src';
import { Post } from './entity/Post';
import { Author } from './entity/Author';
import { Photo } from './entity/Photo';
import { Tag } from './entity/Tag';
import { Counters } from './entity/Counters';

export async function prepareData(manager: EntityManager) {
	const photo1 = new Photo();
	photo1.id = 1;
	photo1.filename = 'saw.jpg';
	photo1.description = 'Me and saw';
	await manager.save(photo1);

	const photo2 = new Photo();
	photo2.id = 2;
	photo2.filename = 'chain.jpg';
	photo2.description = 'Me and chain';
	await manager.save(photo2);

	const user1 = new Author();
	user1.id = 1;
	user1.firstName = 'Timber';
	user1.lastName = 'Saw';
	user1.age = 25;
	user1.photos = [photo1, photo2];
	await manager.save(user1);

	const user2 = new Author();
	user2.id = 2;
	user2.firstName = 'Gyro';
	user2.lastName = 'Copter';
	user2.age = 52;
	user2.photos = [];
	await manager.save(user2);

	const tag1 = new Tag();
	tag1.id = 1;
	tag1.name = 'category #1';
	await manager.save(tag1);

	const tag2 = new Tag();
	tag2.id = 2;
	tag2.name = 'category #2';
	await manager.save(tag2);

	const tag3 = new Tag();
	tag3.id = 3;
	tag3.name = 'category #3';
	await manager.save(tag3);

	const post1 = new Post();
	post1.id = 1;
	post1.title = 'Post #1';
	post1.text = 'About post #1';
	post1.author = user1;
	post1.tags = [tag1, tag2];
	post1.counters = new Counters();
	post1.counters.likes = 1;
	post1.counters.likedUsers = [user1];
	await manager.save(post1);

	const post2 = new Post();
	post2.id = 2;
	post2.title = 'Post #2';
	post2.text = 'About post #2';
	post2.author = user1;
	post2.tags = [tag2];
	post2.counters = new Counters();
	post2.counters.likes = 2;
	post2.counters.likedUsers = [user1, user2];
	await manager.save(post2);

	const post3 = new Post();
	post3.id = 3;
	post3.title = 'Post #3';
	post3.text = 'About post #3';
	post3.author = user2;
	post3.tags = [tag1];
	post3.counters = new Counters();
	post3.counters.likes = 1;
	post3.counters.likedUsers = [user2];
	await manager.save(post3);

	const post4 = new Post();
	post4.id = 4;
	post4.title = 'Post #4';
	post4.text = 'About post #4';
	post4.author = user1;
	post4.tags = [];
	post4.counters = new Counters();
	post4.counters.likes = 1;
	post4.counters.likedUsers = [user1];
	await manager.save(post4);
}
