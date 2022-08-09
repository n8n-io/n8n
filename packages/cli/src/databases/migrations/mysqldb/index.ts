import { InitialMigration1588157391238 } from './1588157391238-InitialMigration';
import { WebhookModel1592447867632 } from './1592447867632-WebhookModel';
import { CreateIndexStoppedAt1594902918301 } from './1594902918301-CreateIndexStoppedAt';
import { AddWebhookId1611149998770 } from './1611149998770-AddWebhookId';
import { MakeStoppedAtNullable1607431743767 } from './1607431743767-MakeStoppedAtNullable';
import { ChangeDataSize1615306975123 } from './1615306975123-ChangeDataSize';
import { ChangeCredentialDataSize1620729500000 } from './1620729500000-ChangeCredentialDataSize';
import { CreateTagEntity1617268711084 } from './1617268711084-CreateTagEntity';
import { UniqueWorkflowNames1620826335440 } from './1620826335440-UniqueWorkflowNames';
import { CertifyCorrectCollation1623936588000 } from './1623936588000-CertifyCorrectCollation';
import { AddWaitColumnId1626183952959 } from './1626183952959-AddWaitColumn';
import { UpdateWorkflowCredentials1630451444017 } from './1630451444017-UpdateWorkflowCredentials';
import { AddExecutionEntityIndexes1644424784709 } from './1644424784709-AddExecutionEntityIndexes';
import { CreateUserManagement1646992772331 } from './1646992772331-CreateUserManagement';
import { LowerCaseUserEmail1648740597343 } from './1648740597343-LowerCaseUserEmail';
import { AddUserSettings1652367743993 } from './1652367743993-AddUserSettings';
import { CommunityNodes1652254514003 } from './1652254514003-CommunityNodes';
import { AddAPIKeyColumn1652905585850 } from './1652905585850-AddAPIKeyColumn';
import { IntroducePinData1654090101303 } from './1654090101303-IntroducePinData';
import { AddNodeIds1658932910559 } from './1658932910559-AddNodeIds';

export const mysqlMigrations = [
	InitialMigration1588157391238,
	WebhookModel1592447867632,
	CreateIndexStoppedAt1594902918301,
	AddWebhookId1611149998770,
	MakeStoppedAtNullable1607431743767,
	ChangeDataSize1615306975123,
	ChangeCredentialDataSize1620729500000,
	CreateTagEntity1617268711084,
	UniqueWorkflowNames1620826335440,
	CertifyCorrectCollation1623936588000,
	AddWaitColumnId1626183952959,
	UpdateWorkflowCredentials1630451444017,
	AddExecutionEntityIndexes1644424784709,
	CreateUserManagement1646992772331,
	LowerCaseUserEmail1648740597343,
	AddUserSettings1652367743993,
	CommunityNodes1652254514003,
	AddAPIKeyColumn1652905585850,
	IntroducePinData1654090101303,
	AddNodeIds1658932910559,
];
