output "vm_name" {
  value = azurerm_linux_virtual_machine.main.name
}

output "ip" {
  value = azurerm_public_ip.main.ip_address
}

output "ssh_username" {
  value = azurerm_linux_virtual_machine.main.admin_username
}
