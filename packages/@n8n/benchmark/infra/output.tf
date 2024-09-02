output "vm_name" {
  value = module.test_vm.vm_name
}

output "ip" {
  value = module.test_vm.ip
}

output "ssh_username" {
  value = module.test_vm.ssh_username
}

output "ssh_private_key" {
  value     = tls_private_key.ssh_key.private_key_pem
  sensitive = true
}
