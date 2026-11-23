# Source: LIGO-1510, first slice of the cross-project promotion spike (LIGO-1159).
Feature: Promote and Apply a credential on its own
  A user selects a credential in the changes view of its owner project. Promote and Apply then
  handle the credential without a workflow that uses it. The branch path of a credential names its
  owner project. Apply never chooses an owner project.

  Background:
    Given the team projects "Sales" and "Platform"
    And project "Platform" owns the credential "CRM key" of type "httpHeaderAuth"
    And project "Platform" shares "CRM key" with project "Sales"
    And workflow "Sync orders" of project "Sales" uses "CRM key"
    And no workflow of project "Platform" uses "CRM key"

  Rule: A project lists only the credentials that it owns as selectable

    Scenario: The owner project lists its credential as selectable
      Given "CRM key" is not on the branch
      When a user opens the changes view of project "Platform"
      Then the view shows "CRM key" as added
      And "CRM key" is selectable

    Scenario: A project that only uses a credential does not list it as selectable
      When a user opens the changes view of project "Sales"
      Then "CRM key" is not selectable
      And "CRM key" shows as context of "Sync orders"

    Scenario: An instance credential is not selectable
      Given project "Platform" owns the credential "Shared proxy" with the usage scope "instance"
      When a user opens the changes view of project "Platform"
      Then "Shared proxy" is not selectable

    Scenario: A credential with no values is not selectable
      Given project "Platform" owns the credential "Draft key" with no values
      When a user opens the changes view of project "Platform"
      Then "Draft key" is not selectable

  Rule: Only the name, the type and the owner folder make a credential change

    Scenario: A credential that the branch lacks is added
      Given "CRM key" is not on the branch
      When a user opens the changes view of project "Platform"
      Then "CRM key" shows as added

    Scenario Outline: A different name or type is a modification
      Given "CRM key" is on the branch under project "Platform" with the <field> "<branch value>"
      And "CRM key" has the <field> "<source value>" on the source
      When a user opens the changes view of project "Platform"
      Then "CRM key" shows as modified

      Examples:
        | field | branch value  | source value   |
        | name  | CRM token     | CRM key        |
        | type  | oAuth2Api     | httpHeaderAuth |

    Scenario: A credential on the branch outside the folder of its owner project is a modification
      Given "CRM key" is on the branch at the top level
      When a user opens the changes view of project "Platform"
      Then "CRM key" shows as modified

    Scenario: A new secret value is not a change
      Given "CRM key" is on the branch under project "Platform" with the same name and type
      And a user changed the secret value of "CRM key" on the source
      When a user opens the changes view of project "Platform"
      Then "CRM key" shows as unchanged
      And "CRM key" is not selectable
      And the row says that values are not promoted

  Rule: A user needs two rights to select a credential

    Scenario: A project admin who can read the credential selects it
      Given the user can promote project "Platform"
      And the user has "credential:read" on "CRM key"
      When the user opens the changes view of project "Platform"
      Then "CRM key" is selectable

    Scenario: A user without the right to read the credential does not see it
      Given the user can promote project "Platform"
      And the user has no "credential:read" on "CRM key"
      When the user opens the changes view of project "Platform"
      Then the view does not show "CRM key"

    Scenario: A request that names a credential without the right to read it is refused
      Given the user can promote project "Platform"
      And the user has no "credential:read" on "CRM key"
      When the user promotes project "Platform" with credential "CRM key" selected
      Then the Promote writes nothing
      And the response says that the request is forbidden

    Scenario: A user without the right to promote the owner project cannot select the credential
      Given the user cannot promote project "Platform"
      And the user has "credential:read" on "CRM key"
      When the user promotes project "Platform" with credential "CRM key" selected
      Then the Promote writes nothing
      And the response says that the request is forbidden

  Rule: Promote writes a selected credential under the folder of its owner project

    Scenario: Promote writes a credential without a workflow
      Given "CRM key" is not on the branch
      When the user promotes project "Platform" with only credential "CRM key" selected
      Then the branch holds "CRM key" under the folder of project "Platform"
      And the branch file holds the id, the name, the type and the owner of "CRM key"
      And the branch file holds no secret value

    Scenario: Promote does not write a credential that is not selected
      Given project "Platform" owns the credentials "CRM key" and "Billing key"
      When the user promotes project "Platform" with only credential "CRM key" selected
      Then the branch holds "CRM key"
      And the branch does not hold "Billing key"

    Scenario: A selected workflow and a selected credential give one credential file
      Given "Sync orders" and "CRM key" both belong to the selection of project "Sales"
      When the user promotes the selection
      Then the branch holds "CRM key" once

    Scenario: A deleted credential stays on the branch
      Given "CRM key" is on the branch under project "Platform"
      And a user deleted "CRM key" on the source
      When the user promotes project "Platform"
      Then the branch still holds "CRM key"

  Rule: Apply reads the owner project of a credential from its branch path

    Scenario: Apply creates a selected credential in its owner project
      Given the branch holds "CRM key" under the folder of project "Platform"
      And the destination does not hold "CRM key"
      When the user applies project "Platform" with only credential "CRM key" selected
      Then the destination holds "CRM key" in project "Platform"
      And "CRM key" has no secret value

    Scenario: Apply updates the name and the type and keeps the values
      Given the branch holds "CRM key" under the folder of project "Platform" with the name "CRM token"
      And the destination holds "CRM key" in project "Platform" with a secret value
      When the user applies project "Platform" with only credential "CRM key" selected
      Then the destination credential has the name "CRM token"
      And the destination credential keeps its secret value

    Scenario: Apply needs the right to create a new credential
      Given the destination does not hold "CRM key"
      And the user cannot create a credential in project "Platform"
      When the user applies project "Platform" with only credential "CRM key" selected
      Then the Apply writes nothing
      And the response says that the request is forbidden

    Scenario: Apply needs the right to update an existing credential
      Given the destination holds "CRM key" in project "Platform"
      And the user cannot update "CRM key"
      When the user applies project "Platform" with only credential "CRM key" selected
      Then the Apply writes nothing
      And the response says that the request is forbidden

    Scenario: Apply keeps a credential in its destination project when the branch names another
      Given the branch holds "CRM key" under the folder of project "Platform"
      And the destination holds "CRM key" in project "Sales"
      When the user applies project "Platform" with only credential "CRM key" selected
      Then "CRM key" stays in project "Sales"
      And the result says that the owner project differs between the branch and the destination

    Scenario: Apply never deletes a credential
      Given the destination holds "Old key" in project "Platform"
      And the branch does not hold "Old key"
      When the user applies project "Platform"
      Then the destination still holds "Old key"

  Rule: An existing top-level credential has no owner project and Apply never chooses one

    Scenario: Apply binds a top-level credential to the destination credential with the same id
      Given the branch holds "CRM key" at the top level
      And the destination holds "CRM key" in project "Platform"
      When the user applies workflow "Sync orders" of project "Sales"
      Then "Sync orders" uses the destination credential "CRM key"
      And "CRM key" stays in project "Platform"

    Scenario: A top-level credential that the destination lacks gives a gap
      Given the branch holds "CRM key" at the top level
      And the destination does not hold "CRM key"
      When the user applies workflow "Sync orders" of project "Sales"
      Then the Apply reports a gap for "CRM key"
      And the Apply continues
      And the Apply does not create "CRM key" in any project

    Scenario: The next Promote of the owner project writes the credential under its folder
      Given the branch holds "CRM key" at the top level
      When the user promotes project "Platform" with only credential "CRM key" selected
      Then the branch holds "CRM key" under the folder of project "Platform"
      And the branch no longer holds "CRM key" at the top level

    Scenario: A credential id under two project folders has no clear owner
      Given the branch holds "CRM key" under the folders of projects "Platform" and "Sales"
      When the user applies project "Platform" with only credential "CRM key" selected
      Then the Apply writes nothing
      And the response says that the credential has more than one owner on the branch
      And the response names a project only when the user can access it

  Rule: Other dependency types need no new selection

    Scenario: A sub-workflow is selected as a workflow
      Given workflow "Notify on-call" of project "Platform" is called by "Sync orders"
      When a user opens the changes view of project "Platform"
      Then "Notify on-call" is selectable

    Scenario: A data table comes with the workflows of its own project only
      Given project "Platform" owns the data table "Orders"
      When a user opens the changes view of project "Platform"
      Then "Orders" is not selectable

    Scenario: A variable is not selectable
      Given project "Platform" owns the variable "REGION"
      When a user opens the changes view of project "Platform"
      Then "REGION" is not selectable
