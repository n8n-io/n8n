import { Service } from 'typedi';

import type { TestEntity } from '@/databases/entities/test-entity';
// import type { User } from '@/databases/entities/user';
import { TestRepository } from '@/databases/repositories/test.repository';
import { validateEntity } from '@/generic-helpers';
// import type { ListQuery } from '@/requests';

@Service()
export class TestsService {
	constructor(private testRepository: TestRepository) {}

	// toEntity(attrs: { name: string; id?: string }) {
	// 	attrs.name = attrs.name.trim();
	//
	// 	return this.testRepository.create(attrs);
	// }

	async save(test: TestEntity) {
		await validateEntity(test);

		return await this.testRepository.save(test);
	}

	async delete(id: string) {
		return await this.testRepository.delete(id);
	}

	async getMany(/*user: User, options: ListQuery.Options*/) {
		const allTests = await this.testRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
		});

		return { allTests, count: allTests.length };
	}
}
