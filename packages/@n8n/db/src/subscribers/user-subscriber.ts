import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { EntitySubscriberInterface, UpdateEvent } from '@n8n/typeorm';
import { EventSubscriber } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { Project, User } from '../entities';
import { UserRepository } from '../repositories/user.repository';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
	private readonly eventReporter = Container.get(ErrorReporter);

	listenTo() {
		return User;
	}

	async afterUpdate(event: UpdateEvent<User>): Promise<void> {
		if (event.entity) {
			const newUserData = event.entity;

			if (event.databaseEntity) {
				const fields = event.updatedColumns.map((c) => c.propertyName);

				if (
					fields.includes('firstName') ||
					fields.includes('lastName') ||
					fields.includes('email')
				) {
					const oldUser = event.databaseEntity;
					const userEntity =
						newUserData instanceof User
							? newUserData
							: Container.get(UserRepository).create(newUserData);

					const projectName = userEntity.createPersonalProjectName();

					const project = await event.manager.findOneBy(Project, {
						type: 'personal',
						projectRelations: { userId: oldUser.id },
					});

					if (!project) {
						// Since this is benign we're not throwing the exception. We don't
						// know if we're running inside a transaction and thus there is a risk
						// that this could cause further data inconsistencies.
						const message = "Could not update the personal project's name";
						Container.get(Logger).warn(message, event.entity);
						const exception = new UnexpectedError(message);
						this.eventReporter.warn(exception, event.entity);
						return;
					}

					project.name = projectName;

					await event.manager.save(Project, project);
				}
			} else {
				// This means the user was updated using `Repository.update`. In this
				// case we're missing the user's id and cannot update their project.
				//
				// When updating the user's firstName, lastName or email we must use
				// `Repository.save`, so this is a bug and we should report it to sentry.
				//
				if (event.entity.firstName || event.entity.lastName || event.entity.email) {
					// Since this is benign we're not throwing the exception. We don't
					// know if we're running inside a transaction and thus there is a risk
					// that this could cause further data inconsistencies.
					const message = "Could not update the personal project's name";
					Container.get(Logger).warn(message, event.entity);
					const exception = new UnexpectedError(message);
					this.eventReporter.warn(exception, event.entity);
				}
			}
		}
	}
}
