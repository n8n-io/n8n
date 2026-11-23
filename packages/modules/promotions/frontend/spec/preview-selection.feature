# Source: the promote prototype (promote-prototype.html) and the team's answers on the hierarchy,
# the scope and sub-workflows. It describes the tree and the selection of the promotion preview.
Feature: Selection and tree of the promotion preview
  The preview lists the resources of a Promote or an Apply in groups by type. A user selects what
  to send. A resource that a selected resource needs is added and locked. The page shows how many
  resources of each group the operation includes.

  Background:
    Given the project "Sales" has the workflows "Lead enrichment", "Invoice sync" and "Weekly report"
    And "Lead enrichment" uses the credentials "Gmail account" and "HubSpot API key"
    And "Invoice sync" uses the credential "HubSpot API key" and the data table "Tickets"
    And "Weekly report" uses nothing
    And workflow "Invoice sync" calls the workflow "Normalize" of project "Ops"
    And the user opens the changes of project "Sales"

  Rule: The tree groups resources by type and keeps the project hierarchy under "Workflows"

    Scenario: Workflows come first, with the project and folders as a tree
      Then the tree shows the group "Workflows" first
      And the group holds the project "Sales" as its top-level row
      And the folders and workflows of "Sales" are below the project

    Scenario: A project without workflows shows its own row and no "Workflows" group
      Given "Sales" holds no workflow in the preview
      And "Sales" has a credential "CRM key" that the user can select
      Then the tree shows the project "Sales" as a row of its own
      And the tree shows no group "Workflows"

    Scenario: The other groups follow in a fixed order
      Then the groups follow in this order:
        | group         |
        | Workflows     |
        | Sub-workflows |
        | Credentials   |
        | Variables     |
        | Data tables   |
        | Tags          |
      And a group that holds no resource is not shown

    Scenario: A new type of resource needs only one entry in the group list
      Given a new resource type "Agents" is added to the group list
      When the preview holds an agent
      Then the tree shows the group "Agents" with its row

  Rule: A group header shows how many of its resources the operation includes

    Scenario: The header counts the included resources of the group
      When the user selects "Lead enrichment"
      Then the header of "Workflows" reads "1 of 3 selected"
      And the header of "Credentials" reads "2 of 2 selected"

    Scenario: Folders and the project are not counted in "Workflows"
      Given "Sales" has a folder "Billing"
      Then the header of "Workflows" counts workflows only

    Scenario: The group checkbox shows none, some or all
      Then the checkbox of "Workflows" is empty when no workflow is included
      And it is partly filled when some workflows are included
      And it is filled when every workflow is included

  Rule: The group checkbox selects or clears the resources that the user can select in the group

    Scenario: A click selects every selectable resource of the group
      Given no workflow is selected
      When the user clicks the checkbox of "Workflows"
      Then "Lead enrichment", "Invoice sync" and "Weekly report" are selected

    Scenario: A click on a full group clears it
      Given every workflow is selected
      When the user clicks the checkbox of "Workflows"
      Then no workflow is selected

    Scenario: A click on a partly selected group selects the rest
      Given "Weekly report" is selected
      When the user clicks the checkbox of "Workflows"
      Then every workflow is selected

    Scenario: A locked resource stays included when its group is cleared
      Given "Lead enrichment" is selected
      And every credential is selected
      When the user clicks the checkbox of "Credentials"
      Then "Gmail account" and "HubSpot API key" stay included as required by "Lead enrichment"
      And "Gmail account" and "HubSpot API key" stay locked

    Scenario: A blocked workflow is not added by the group checkbox
      Given "Invoice sync" is blocked
      When the user clicks the checkbox of "Workflows"
      Then "Invoice sync" is not selected

    Scenario: A group of resources that nobody selects directly is read-only
      Given the data table "Tickets" is not selectable on its own
      Then the checkbox of "Data tables" is disabled
      And it still shows whether "Tickets" is included

  Rule: A resource that a selected resource needs is locked

    Scenario: A dependency is checked and locked
      When the user selects "Lead enrichment"
      Then "Gmail account" is checked and locked

    Scenario: A locked resource cannot be toggled
      Given "Gmail account" is locked
      When the user clicks "Gmail account"
      Then "Gmail account" stays checked

    Scenario: A dependency is unlocked when nothing needs it any more
      Given "Gmail account" is required only by "Lead enrichment"
      When the user clears "Lead enrichment"
      Then "Gmail account" is not locked

    Scenario: A resource that the user selected stays selected when it stops being required
      Given the user selected "Gmail account" and "Lead enrichment"
      When the user clears "Lead enrichment"
      Then "Gmail account" stays selected

    Scenario: A dependency is counted once, however many resources need it
      When the user selects "Lead enrichment" and "Invoice sync"
      Then "HubSpot API key" is included once

  Rule: A sub-workflow is a reference and stays outside the lock

    Scenario: A selected workflow does not lock its sub-workflow
      When the user selects "Invoice sync"
      Then "Normalize" is not locked
      And "Normalize" is not selected
      And the row of "Invoice sync" shows that it calls "Normalize"

    Scenario: A sub-workflow is selected on its own
      When the user selects "Normalize"
      Then "Normalize" is selected

  Rule: "Select all" and the counts cover the whole preview

    Scenario: "Select all" selects every resource that the user can select
      When the user clicks "Select all"
      Then every selectable resource is selected
      And every dependency is locked or selected

    Scenario: "Select all" shows none, some or all
      Then the checkbox of "Select all" is empty when nothing is selected
      And it is partly filled when some resources are selected
      And it is filled when every selectable resource is selected

    Scenario: The counter counts included changes
      When the user selects "Lead enrichment"
      Then the counter reads the included changes of "Lead enrichment" and its dependencies out of all changes

  Rule: The same tree serves Promote, Apply and the review list

    Scenario: Apply keeps its own rules for what the user can select
      Given the user opens the changes of project "Sales" for Apply
      Then a credential is shown as a dependency and the user cannot select it
      And the group "Credentials" checkbox is disabled

    Scenario: A review list shows the groups and counts and no checkbox
      Given the user opens a review of project "Sales"
      Then the tree shows the same groups
      And the tree shows no checkbox
      And the header of each group shows no selection count

    Scenario: A whole-instance Apply has no selection
      Given the user opens the whole-instance Apply preview
      Then the tree shows no checkbox
