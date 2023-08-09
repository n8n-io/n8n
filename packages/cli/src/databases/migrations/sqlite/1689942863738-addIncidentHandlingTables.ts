import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIncidentHandlingTables1689942863738 implements MigrationInterface {
	name = 'addIncidentHandlingTables1689942863738';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "server_incident" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lastUpdateByAppUserId" character varying, "lastUpdateByZohoUserId" character varying, "lastUpdateSource" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "API" character varying, "APIMethod" character varying, "APIBody" json, "queueName" character varying, "errorMessage" character varying NOT NULL, "errorStackTrace" character varying, "incidentTime" TIMESTAMP NOT NULL, "additionalInformation" json, "zohoDeskTicketId" character varying, "correlationId" character varying, "isResolved" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_c24ae1e5263dccb981312915dfc" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."data_recovery_activity_status_enum" AS ENUM('progressing', 'failed', 'completed')`,
		);
		await queryRunner.query(
			`CREATE TABLE "data_recovery_activity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lastUpdateByAppUserId" character varying, "lastUpdateByZohoUserId" character varying, "lastUpdateSource" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "syncFrom" TIMESTAMP WITH TIME ZONE NOT NULL, "modules" text array NOT NULL DEFAULT '{}', "status" "public"."data_recovery_activity_status_enum" NOT NULL DEFAULT 'progressing', "failureReason" text, CONSTRAINT "PK_f6da98f8214eee9b5e5ad97a651" PRIMARY KEY ("id"))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "data_recovery_activity"`);
		await queryRunner.query(`DROP TYPE "public"."data_recovery_activity_status_enum"`);
		await queryRunner.query(`DROP TABLE "server_incident"`);
	}
}
