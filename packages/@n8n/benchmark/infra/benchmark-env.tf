
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# Random prefix for the resources
resource "random_string" "prefix" {
  length  = 8
  special = false
}

# SSH key pair
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Dedicated Host Group & Hosts

resource "azurerm_dedicated_host_group" "main" {
  name                        = "${random_string.prefix.result}-hostgroup"
  location                    = var.location
  resource_group_name         = data.azurerm_resource_group.main.name
  platform_fault_domain_count = 1
  automatic_placement_enabled = false
  zone                        = 1

  tags = local.common_tags
}

resource "azurerm_dedicated_host" "hosts" {
  name                    = "${random_string.prefix.result}-host"
  location                = var.location
  dedicated_host_group_id = azurerm_dedicated_host_group.main.id
  sku_name                = var.host_size_family
  platform_fault_domain   = 0

  tags = local.common_tags
}

# VM

module "test_vm" {
  source = "./modules/benchmark-vm"

  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  prefix              = random_string.prefix.result
  dedicated_host_id   = azurerm_dedicated_host.hosts.id
  ssh_public_key      = tls_private_key.ssh_key.public_key_openssh
  vm_size             = var.vm_size

  tags = local.common_tags
}
