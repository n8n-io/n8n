import { AbstractRepository } from '../../../../../src/repository/AbstractRepository';
import { Post } from '../entity/Post';
import { EntityManager } from '../../../../../src/entity-manager/EntityManager';
import { EntityRepository } from '../../../../../src/decorator/EntityRepository';

@EntityRepository()
export class PostRepository extends AbstractRepository<Post> {
	save(post: Post) {
		return this.manager.save(post);
	}

	getManager(): EntityManager {
		return this.manager;
	}
}
