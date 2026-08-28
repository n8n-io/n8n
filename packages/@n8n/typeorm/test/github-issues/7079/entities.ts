import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from '../../../src';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@OneToMany(
		() => Post,
		(post) => post.user,
	)
	posts: Post[];
}

export class PublishInfo {
	@Column({ nullable: true })
	date: Date;
}

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	text: string;

	@Column((_type) => PublishInfo)
	blog: PublishInfo;

	@Column((_type) => PublishInfo)
	newsletter: PublishInfo;

	@ManyToOne(
		() => User,
		(user) => user.posts,
	)
	user: User;
}
