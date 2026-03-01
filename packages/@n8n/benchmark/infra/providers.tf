
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.115.0"
    }

    random = {
      source = "hashicorp/random"
    }
  }

  required_version = "~> 1.8.5"
}

provider "azurerm" {
  features {}

  skip_provider_registration = true
}

provider "random" {}
