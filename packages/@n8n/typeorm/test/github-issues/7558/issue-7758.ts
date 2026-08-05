import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/index';
import { expect } from 'chai';

import { AnimalEntity } from './entity/Animal';
import { CatEntity } from './entity/Cat';
import { DogEntity } from './entity/Dog';
import { NnaryOperator } from './entity/NnaryOperator';
import { NumberEntry } from './entity/NumberEntry';
import { OperatorTreeEntry } from './entity/OperatorTreeEntry';
import { PersonEntity } from './entity/Person';
import { Photo } from './entity/Photo';

describe("github issues > #7558 Child entities' wrong discriminator value when embedded in parent entity", () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should use the correct subclass for inheritance when saving & retrieving a single STI entity (one-to-one)', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const personRepo = entityManager.getRepository(PersonEntity);
				const photoRepo = entityManager.getRepository(Photo);

				const photo = photoRepo.create({
					title: 'Cat Photo',
					size: 42,
				});
				expect(photo).to.be.instanceOf(Photo);

				// Create a new person, cascade saving the content.
				const person = personRepo.create({
					pets: [],
					content: photo,
				});
				expect(person.content).not.to.be.undefined;
				expect(person.content).to.be.instanceOf(Photo);
				await entityManager.save(person);

				// Retrieve it back from the DB.
				const persons = await personRepo.find();
				expect(persons.length).to.equal(1);

				// And check whether the content / photo is still the same.
				expect(persons[0].pets.length).to.equal(0);
				expect(persons[0].content).not.to.be.undefined;
				expect(persons[0].content).not.to.be.null;
				expect(persons[0].content).to.be.instanceOf(Photo);
				expect(persons[0].content).to.include(photo);
			}),
		));

	it('should use the correct subclass for inheritance when saving & retrieving multiple STI entities (one-to-many)', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const personRepo = entityManager.getRepository(PersonEntity);
				const animalRepo = entityManager.getRepository(AnimalEntity);
				const dogRepo = entityManager.getRepository(DogEntity);
				const catRepo = entityManager.getRepository(CatEntity);

				const mysteryUnicorn = animalRepo.create({
					name: 'i-am-a-mystery',
				});
				expect(mysteryUnicorn).to.be.instanceOf(AnimalEntity);
				const felix = catRepo.create({
					name: 'felix',
					livesLeft: 9,
					// Cat stuff
				});
				expect(felix).to.be.instanceOf(CatEntity);
				const spike = dogRepo.create({
					name: 'spike',
					steaksEaten: 42,
					// Dog stuff
				});
				expect(spike).to.be.instanceOf(DogEntity);
				const pets = [mysteryUnicorn, felix, spike];

				// Create a new person, cascade saving the pets.
				const person = personRepo.create({
					pets,
				});
				expect(person.pets[0]).to.be.instanceOf(AnimalEntity);
				expect(person.pets[1]).to.be.instanceOf(CatEntity);
				expect(person.pets[2]).to.be.instanceOf(DogEntity);
				await entityManager.save(person);

				// Retrieve it back from the DB.
				const persons = await personRepo.find({ relations: ['pets'] });
				expect(persons.length).to.equal(1);

				// And check whether the pets are still the same.
				expect(persons[0].pets.length).to.equal(3);
				const animalPets = persons[0].pets.filter(
					(entity) =>
						entity instanceof AnimalEntity &&
						!(entity instanceof CatEntity) &&
						!(entity instanceof DogEntity),
				);
				const catPets = persons[0].pets.filter((entity) => entity instanceof CatEntity);
				const dogPets = persons[0].pets.filter((entity) => entity instanceof DogEntity);
				expect(animalPets.length).to.equal(1);
				expect(animalPets[0]).to.include(mysteryUnicorn);
				expect(catPets.length).to.equal(1);
				expect(catPets[0]).to.include(felix);
				expect(dogPets.length).to.equal(1);
				expect(dogPets[0]).to.include(spike);
			}),
		));

	it('should set the correct discriminators for trees in STI settings', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const operatorTreeRepo = entityManager.getTreeRepository(OperatorTreeEntry);
				const nnaryOperatorRepo = entityManager.getTreeRepository(NnaryOperator);
				const numberEntryRepo = entityManager.getRepository(NumberEntry);

				// Create an operator tree (10.5 * (21 + 42)).
				const num1 = numberEntryRepo.create({ value: 42 });
				const num2 = numberEntryRepo.create({ value: 21 });
				const num3 = numberEntryRepo.create({ value: 10.5 });

				const mulOperator = nnaryOperatorRepo.create({
					operator: '*',
				});

				// Save the tree...
				// We need to first save the parents step by step.
				const savedMulOperator = await operatorTreeRepo.save(mulOperator);
				const plusOperator = nnaryOperatorRepo.create({
					parent: savedMulOperator,
					operator: '+',
				});
				num3.parent = savedMulOperator;

				await operatorTreeRepo.save(num3);
				const savedPlusOperator = await operatorTreeRepo.save(plusOperator);

				num1.parent = savedPlusOperator;
				num2.parent = savedPlusOperator;
				await operatorTreeRepo.save([num1, num2]);

				// ... and fetch it from the database.
				const fetchedTrees = await operatorTreeRepo.findTrees();
				expect(fetchedTrees.length).to.eql(1);
				expect(fetchedTrees[0]).to.be.instanceOf(NnaryOperator);
				const fetchedOperator = fetchedTrees[0] as NnaryOperator;
				expect(fetchedOperator.operator).to.eql('*');

				expect(fetchedOperator.children.length).to.be.eql(2);
				// Order is *not* deterministic by default...
				expect(
					fetchedOperator.children.find((operator) => operator.id === num3.id),
				).to.be.instanceOf(NumberEntry);
				expect(
					fetchedOperator.children.find((operator) => operator.id === savedPlusOperator.id),
				).to.be.instanceOf(NnaryOperator);

				const subOperator = fetchedOperator.children.find(
					(operator) => operator.id === savedPlusOperator.id,
				) as NnaryOperator;
				expect(subOperator.operator).to.eql('+');
				expect(subOperator.children.length).to.be.eql(2);
				expect(subOperator.children[0]).to.be.instanceOf(NumberEntry);
				expect(subOperator.children[1]).to.be.instanceOf(NumberEntry);
			}),
		));
});
